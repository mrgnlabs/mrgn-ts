import { NextApiRequest, NextApiResponse } from "next";
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
  verifySignature,
  generateCreds,
  SignupPayload,
  AuthApiSuccessResponse,
  AuthApiErrorResponse,
  AuthUser,
} from "@mrgnlabs/mrgn-utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthApiSuccessResponse | AuthApiErrorResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ user: null, error: "Method not allowed" });
  }

  try {
    const { walletAddress, signature, walletId, referralCode }: SignupPayload = req.body;

    // Verify the signature
    const signatureBytes = Buffer.from(signature, "base64");
    const isValidSignature = verifySignature(walletAddress, signatureBytes);

    if (!isValidSignature) {
      return res.status(401).json({ user: null, error: "Invalid signature" });
    }

    const supabase = createServerSupabaseClient(req, res);
    const adminSupabase = createAdminSupabaseClient();
    const { email, password } = generateCreds(walletAddress, signature);

    // Check if user exists in Supabase Auth using admin client
    const { data: userList, error: listError } = await adminSupabase.auth.admin.listUsers();
    if (listError) {
      console.error("Error fetching users:", listError);
      return res.status(500).json({ user: null, error: "Failed to check existing users" });
    }

    const existingUser = userList.users.find((u) => u.user_metadata?.wallet_address === walletAddress);

    if (existingUser) {
      return res.status(400).json({ user: null, error: "User already exists" });
    }

    // Create the user in Supabase Auth using admin client
    const { data: userData, error: createError } = await adminSupabase.auth.admin.createUser({
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
      return res.status(400).json({ user: null, error: createError?.message || "Failed to create user" });
    }

    // Authenticate the user using regular client
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      console.error("Error authenticating user:", authError);
      return res.status(500).json({ user: null, error: "Failed to authenticate user" });
    }

    // Set the Supabase session cookie
    // This follows the recommended approach in the Supabase docs
    await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });

    const user: AuthUser = {
      id: userData.user.id,
      walletAddress,
      walletId,
      referralCode,
    };

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      user: null,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
