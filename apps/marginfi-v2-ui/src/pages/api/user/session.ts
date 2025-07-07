import { NextApiRequest, NextApiResponse } from "next";
import { initFirebaseIfNeeded } from "./utils";
import * as admin from "firebase-admin";
import { STATUS_BAD_REQUEST, STATUS_INTERNAL_ERROR, STATUS_OK } from "@mrgnlabs/mrgn-state";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(STATUS_BAD_REQUEST).json({ error: "Missing ID token" });
    }

    initFirebaseIfNeeded();

    // Create a session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    // Set the session cookie
    res.setHeader(
      "Set-Cookie",
      `session=${sessionCookie}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${expiresIn / 1000}`
    );

    return res.status(STATUS_OK).json({ success: true });
  } catch (error: any) {
    console.error("Error creating session:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
