import type { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
import { fetchAuthToken } from "~/utils";

const ARENA_URL = `${process.env.MARGINFI_API_URL}/arena/register`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    let token = cookies.jwt;

    // If the token is missing, fetch a new one
    if (!token) {
      try {
        token = await fetchAuthToken(req);
      } catch (error) {
        console.error("Error fetching new JWT:", error);
        return res.status(401).json({ error: "Unauthorized: Unable to fetch token" });
      }
    }

    const { base_bank, created_by, group, lookup_tables, quote_bank } = req.body;

    const response = await fetch(ARENA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
