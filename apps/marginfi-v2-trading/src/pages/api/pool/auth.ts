import type { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";

// Constants for cache times (in seconds)
const S_MAXAGE_TIME = 3600; // Cache for 1 hour
const STALE_WHILE_REVALIDATE_TIME = 3600; // Allow stale data for 1 hour

const AUTH_URL = `${process.env.MARGINFI_API_URL}/auth/login/jwt`;
const USERNAME = process.env.API_AUTH_USERNAME;
const PASSWORD = process.env.API_AUTH_PASSWORD;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const existingToken = cookies.jwt;
    if (existingToken) {
      return res.status(200).json({ success: true, token: existingToken });
    }

    // If JWT doesn't exist, fetch a new token from the external API
    const encodedCredentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${encodedCredentials}`,
      },
      body: JSON.stringify({
        client_id: USERNAME,
        client_secret: PASSWORD,
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to authenticate" });
    }

    // Parse the JSON response
    const data = await response.json();

    if (!data.access_token) {
      return res.status(500).json({ error: "Failed to retrieve access token from API response" });
    }

    // Set the JWT as an HTTP-only cookie
    res.setHeader(
      "Set-Cookie",
      `jwt=${data.access_token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${S_MAXAGE_TIME}`
    );
    // Set cache headers for the response
    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);

    // Return the new token in the response
    return res.status(200).json({ success: true, token: data.access_token });
  } catch (error) {
    console.error("Error during authentication:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
