import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "~/auth/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = createServerSupabaseClient();
    
    // Get the authenticated user from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = authData.user;
    
    // Return the user data in the format expected by the frontend
    return res.status(200).json({
      user: {
        id: user.id,
        walletAddress: user.user_metadata?.wallet_address,
        walletId: user.user_metadata?.wallet_id,
        referralCode: user.user_metadata?.referral_code,
        referredBy: user.user_metadata?.referred_by,
        lastLogin: user.last_sign_in_at,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
