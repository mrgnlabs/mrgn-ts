import { NextApiRequest, NextApiResponse } from "next";
import { STATUS_OK } from "@mrgnlabs/mrgn-state";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);

  return res.status(STATUS_OK).json({ success: true });
}
