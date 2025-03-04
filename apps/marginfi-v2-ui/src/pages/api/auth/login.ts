import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "~/auth/auth-server";
import { verifySignature } from "~/auth/utils/auth-crypto.utils";
import { generateToken, verifyToken } from "~/auth/utils/auth-jwt.utils";
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
      const isValidSignature = verifySignature(walletAddress, signatureBytes, signedMessage);

      if (!isValidSignature) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      const supabase = createServerSupabaseClient();

      // Find user by wallet address
      const { data: user, error: userError } = await supabase
        .from("users")
        .select()
        .eq("wallet_address", walletAddress)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update last login and wallet ID if changed
      const { error: updateError } = await supabase
        .from("users")
        .update({
          last_login: new Date().toISOString(),
          wallet_id: walletId || user.wallet_id,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to update user:", updateError);
      }

      // Generate JWT token
      const token = generateToken(walletAddress);

      // Set the token as an HttpOnly cookie
      res.setHeader("Set-Cookie", `auth_token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Strict`);

      return res.status(200).json({
        user: {
          id: user.id,
          walletAddress: user.wallet_address,
          walletId: walletId || user.wallet_id,
          referralCode: user.referral_code,
          referredBy: user.referred_by,
          lastLogin: user.last_login,
        },
      });
    } else {
      // Regular login - check for valid token
      const { walletAddress, walletId }: LoginPayload = req.body;

      const supabase = createServerSupabaseClient();

      // Find user by wallet address
      const { data: user, error: userError } = await supabase
        .from("users")
        .select()
        .eq("wallet_address", walletAddress)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: "User not found" });
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

      // Token is valid, update last login and wallet ID if changed
      const { error: updateError } = await supabase
        .from("users")
        .update({
          last_login: new Date().toISOString(),
          wallet_id: walletId || user.wallet_id,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to update user:", updateError);
      }

      // Generate new JWT token
      const newToken = generateToken(walletAddress);

      // Set the token as an HttpOnly cookie
      res.setHeader("Set-Cookie", `auth_token=${newToken}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Strict`);

      return res.status(200).json({
        user: {
          id: user.id,
          walletAddress: user.wallet_address,
          walletId: walletId || user.wallet_id,
          referralCode: user.referral_code,
          referredBy: user.referred_by,
          lastLogin: user.last_login,
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
