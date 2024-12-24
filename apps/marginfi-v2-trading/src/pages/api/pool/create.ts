import type { NextApiRequest, NextApiResponse } from "next";

const ARENA_URL = "http://202.8.10.73:3000/arena/create";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { base_bank, created_by, featured, group, lookup_tables, quote_banks } = req.body;

    const response = await fetch(ARENA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${req.headers.authorization}`,
      },
      body: JSON.stringify({
        base_bank,
        created_by,
        featured,
        group,
        lookup_tables,
        quote_banks,
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
