import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "~/auth/auth-server";
import { verifySignature } from "~/auth/utils/auth-crypto.utils";
import { generateToken } from "~/auth/utils/auth-jwt.utils";
import { SignupPayload } from "~/auth/types/auth.types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { walletAddress, signature, signedMessage, walletId, referralCode }: SignupPayload = req.body;

    // Verify the signature
    const signatureBytes = Buffer.from(signature, "base64");
    const isValidSignature = verifySignature(walletAddress, signatureBytes, signedMessage);

    if (!isValidSignature) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const supabase = createServerSupabaseClient();

    // Check if user exists
    const { data: existingUser } = await supabase.from("users").select().eq("wallet_address", walletAddress).single();

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create user in users table
    const { data: user, error: createError } = await supabase
      .from("users")
      .insert({
        wallet_address: walletAddress,
        wallet_id: walletId,
        referral_code: referralCode,
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Signup error:", createError);
      return res.status(400).json({ error: createError.message });
    }

    // Generate JWT token
    const token = generateToken(walletAddress);

    // Set the token as an HttpOnly cookie
    res.setHeader("Set-Cookie", `auth_token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Strict`);

    return res.status(200).json({
      user: {
        id: user.id,
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
