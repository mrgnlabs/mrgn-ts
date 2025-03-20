import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "~/auth/auth-server";
import { verifySignature } from "~/auth/utils/auth-crypto.utils";
import { generateToken } from "~/auth/utils/auth-jwt.utils";
import { SignupPayload } from "~/auth/types/auth.types";
import { generateDummyCredentials } from "~/auth/utils/auth.utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { walletAddress, signature, signedMessage, walletId, referralCode }: SignupPayload = req.body;

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

    const existingUser = userList.users.find((u) => u.user_metadata?.wallet_address === walletAddress);

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create the user in Supabase Auth
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        wallet_address: walletAddress,
        wallet_id: walletId,
        referral_code: referralCode,
        last_login: new Date().toISOString(),
      },
    });

    if (createError || !userData.user) {
      console.error("Signup error:", createError);
      return res.status(400).json({ error: createError?.message || "Failed to create user" });
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

    // Generate JWT token
    const token = generateToken(walletAddress);

    // Set the token as an HttpOnly cookie
    res.setHeader("Set-Cookie", `auth_token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Strict`);

    return res.status(200).json({
      user: {
        id: userData.user.id,
        walletAddress,
        walletId,
        referralCode,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
