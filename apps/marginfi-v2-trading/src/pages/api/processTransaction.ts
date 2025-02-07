import cookie from "cookie";
import { NextApiRequest, NextApiResponse } from "next";
import { fetchAuthToken } from "~/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.MARGINFI_API_URL) {
    return res.status(500).json({ error: "API URL is not set" });
  }

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

  try {
    const response = await fetch(`${process.env.MARGINFI_API_URL}/arena/process-transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
