import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "~/auth/auth-server";
import { verifySignature, generateToken, verifyToken, generateDummyCredentials } from "~/auth/utils/";
import { LoginPayload, AuthPayload } from "~/auth/types/auth.types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if this is a login with signature or a regular login
    const hasSignature = req.body.signature && req.body.signedMessage;

    if (hasSignature) {
      // Handle login with signature (similar to signup)
      const { walletAddress, signature, signedMessage, walletId }: AuthPayload = req.body;

      // Verify the signature
      const signatureBytes = Buffer.from(signature, "base64");
      const isValidSignature = verifySignature(walletAddress, signatureBytes);

      if (!isValidSignature) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      const supabase = createServerSupabaseClient();
      const { email, password } = generateDummyCredentials(walletAddress);

      // Check if user exists in Supabase Auth
      const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error("Error fetching users:", listError);
        return res.status(500).json({ error: "Failed to check existing users" });
      }

      const user = userList.users.find((u) => u.user_metadata?.wallet_address === walletAddress);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Update user metadata with new wallet ID if provided
      if (walletId && walletId !== user.user_metadata?.wallet_id) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            wallet_id: walletId,
          },
        });

        if (updateError) {
          console.error("Failed to update user:", updateError);
        }
      }

      // Authenticate the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.session) {
        console.error("Error authenticating user:", authError);
        return res.status(500).json({ error: "Failed to authenticate user" });
      }

      // Generate JWT token for signature validation
      const token = generateToken(walletAddress);

      // Set the token as an HttpOnly cookie
      res.setHeader("Set-Cookie", `auth_token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Strict`);

      return res.status(200).json({
        user: {
          id: user.id,
          walletAddress: walletAddress,
          walletId: walletId || user.user_metadata?.wallet_id,
          referralCode: user.user_metadata?.referral_code,
          referredBy: user.user_metadata?.referred_by,
          lastLogin: user.last_sign_in_at,
        },
      });
    } else {
      // Regular login - check for valid token
      const { walletAddress, walletId }: LoginPayload = req.body;

      const supabase = createServerSupabaseClient();

      // Check if user exists in Supabase Auth
      const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error("Error fetching users:", listError);
        return res.status(500).json({ error: "Failed to check existing users" });
      }

      const user = userList.users.find((u) => u.user_metadata?.wallet_address === walletAddress);

      if (!user) {
        // User not found - this is a new user, require signature for signup
        return res.status(401).json({
          error: "User not found",
          requiresSignature: true,
        });
      }

      // Check for token in cookies
      const token = req.cookies.auth_token;
      let tokenValid = false;

      if (token) {
        try {
          // Simply verify the token is valid
          tokenValid = verifyToken(token);
        } catch (error) {
          console.error("Token verification error:", error);
          tokenValid = false;
        }
      }

      // If token is not valid, require signature verification
      if (!tokenValid) {
        return res.status(401).json({
          error: "Authentication required",
          requiresSignature: true,
        });
      }

      // Token is valid, update wallet ID if changed
      if (walletId && walletId !== user.user_metadata?.wallet_id) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            wallet_id: walletId,
          },
        });

        if (updateError) {
          console.error("Failed to update user:", updateError);
        }
      }

      // Authenticate the user
      const { email, password } = generateDummyCredentials(walletAddress);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.session) {
        console.error("Error authenticating user:", authError);
        return res.status(500).json({ error: "Failed to authenticate user" });
      }

      // Generate new JWT token
      const newToken = generateToken(walletAddress);

      // Set the token as an HttpOnly cookie
      res.setHeader("Set-Cookie", `auth_token=${newToken}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Strict`);

      return res.status(200).json({
        user: {
          id: user.id,
          walletAddress: walletAddress,
          walletId: walletId || user.user_metadata?.wallet_id,
          referralCode: user.user_metadata?.referral_code,
          referredBy: user.user_metadata?.referred_by,
          lastLogin: user.last_sign_in_at,
        },
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
