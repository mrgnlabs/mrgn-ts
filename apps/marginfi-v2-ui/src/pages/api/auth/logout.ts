import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "~/auth/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Clear the auth cookie
  res.setHeader("Set-Cookie", "auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict");
  
  // Sign out from Supabase Auth if there's a session
  try {
    const supabase = createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error signing out from Supabase:", error);
    // Continue with logout even if Supabase signout fails
  }

  return res.status(200).json({ success: true });
}
