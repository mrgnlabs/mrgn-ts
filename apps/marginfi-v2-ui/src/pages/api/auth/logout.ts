import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Clear the auth cookie
  res.setHeader("Set-Cookie", "auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict");

  return res.status(200).json({ success: true });
}
