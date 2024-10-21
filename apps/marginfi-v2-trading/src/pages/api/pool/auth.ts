import type { NextApiRequest, NextApiResponse } from "next";

const AUTH_URL = "http://202.8.10.73:3000/auth/jwt";
const USERNAME = process.env.API_AUTH_USERNAME;
const PASSWORD = process.env.API_AUTH_PASSWORD;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const encodedCredentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");

    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${encodedCredentials}`, // Basic Auth Header
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to authenticate" });
    }

    const data = await response.json();
    const token = data.jwt;

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}
