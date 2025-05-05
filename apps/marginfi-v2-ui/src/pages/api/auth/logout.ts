import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient, LogoutResponse } from "@mrgnlabs/mrgn-utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<LogoutResponse>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Clear the auth cookie
  res.setHeader("Set-Cookie", "auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict");

  // Sign out from Supabase Auth if there's a session
  try {
    const supabase = createServerSupabaseClient(req, res);
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error signing out from Supabase:", error);
    return res.status(500).json({ success: false, error: "Failed to sign out from Supabase" });
  }

  return res.status(200).json({ success: true });
}
