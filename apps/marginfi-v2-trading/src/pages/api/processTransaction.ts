import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.MARGINFI_API_URL) {
    return res.status(500).json({ error: "API URL is not set" });
  }

  if (!process.env.MRGN_ARENA_API_KEY) {
    return res.status(500).json({ error: "API Key is not set" });
  }

  try {
    const response = await fetch(`${process.env.MARGINFI_API_URL}/v1/arena/create-dune-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.MRGN_ARENA_API_KEY,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    return res.status(200).json({ message: "Transaction processed successfully" });
  } catch (error) {
    console.error("Error processing transaction:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}
