import type { NextApiRequest, NextApiResponse } from "next";

const AUTH_URL = "http://202.8.10.73:3000/auth/jwt";
const USERNAME = "your_username"; // Replace with the actual username
const PASSWORD = "your_password"; // Replace with the actual password

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: USERNAME,
        password: PASSWORD,
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to authenticate" });
    }

    const data = await response.json();
    const token = data.token;

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}
