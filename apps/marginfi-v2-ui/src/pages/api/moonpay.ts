import type { NextApiRequest, NextApiResponse } from "next";

import crypto from "crypto";

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { urlForSignature } = req.body;

    if (!urlForSignature) {
      return res.status(400).json({ error: "Missing urlForSignature in request body" });
    }

    const signature = crypto
      .createHmac("sha256", process.env.MOONPAY_SECRET_KEY!)
      .update(new URL(urlForSignature).search)
      .digest("base64");

    return res.status(200).json({ signature });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred while processing your request" });
  }
}
