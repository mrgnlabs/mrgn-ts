import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!process.env.MARGINFI_API_URL) {
      return res.status(500).json({ error: "API URL is not set" });
    }

    if (!process.env.MRGN_ARENA_API_KEY) {
      return res.status(500).json({ error: "API Key is not set" });
    }

    const { base_bank, created_by, group, lookup_tables, quote_bank } = req.body;

    const response = await fetch(`${process.env.MARGINFI_API_URL}/arena/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.MRGN_ARENA_API_KEY,
      },
      body: JSON.stringify({
        base_bank,
        created_by,
        group,
        lookup_tables,
        quote_bank,
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to add pool" });
    }
    res.status(200).json({ message: "Pool added" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}
