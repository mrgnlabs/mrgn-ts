// Next.js API route for user notifications
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiUrl = process.env.MARGINFI_API_URL;
  const apiKey = process.env.MARGINFI_API_KEY;

  if (!apiUrl || !apiKey) {
    return res.status(500).json({ success: false, message: "Invalid API configuration" });
  }

  if (req.method === "POST") {
    const { email, walletAddress, accountHealth, ybxUpdates } = req.body;

    try {
      const response = await fetch(`${apiUrl}/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          email,
          account_health: accountHealth,
          ybx_updates: ybxUpdates,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({ success: true, data });
      } else {
        const errorData = await response.json();
        console.error("Error updating notifications settings via API:", errorData);
        return res
          .status(response.status)
          .json({ success: false, message: errorData.message || "Failed to update notification settings" });
      }
    } catch (error) {
      console.error("Error updating notifications settings:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  } else if (req.method === "GET") {
    const walletAddress = req.query.walletAddress as string;

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: "Missing wallet address" });
    }

    try {
      const response = await fetch(`${apiUrl}/notifications?wallet_address=${walletAddress}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({ success: true, data });
      } else {
        const errorData = await response.json();
        console.error("Error fetching notifications settings via API:", errorData);
        return res
          .status(response.status)
          .json({ success: false, message: errorData.message || "Failed to fetch notification settings" });
      }
    } catch (error) {
      console.error("Error fetching notifications settings:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  } else {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
}
