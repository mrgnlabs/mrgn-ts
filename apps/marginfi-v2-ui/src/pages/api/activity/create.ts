import { NextApiRequest, NextApiResponse } from "next";
import { initFirebaseIfNeeded } from "../user/utils";
import * as admin from "firebase-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { type, details, txn, mfiAccount } = req.body;

    // Get the session cookie from the request
    const sessionCookie = req.cookies.session || "";
    if (!sessionCookie) {
      return res.status(401).json({ error: "Unauthorized - No session cookie" });
    }

    // Initialize Firebase and verify the session cookie
    initFirebaseIfNeeded();
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    const walletAddress = decodedClaims.uid;

    if (!type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = admin.firestore();

    // Add to the user's activities subcollection
    await db
      .collection("activity")
      .doc(walletAddress)
      .collection("activities")
      .add({
        type,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: details || {},
        txn,
        account: mfiAccount,
      });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error creating activity:", error);
    if (error.code === "auth/session-cookie-expired" || error.code === "auth/session-cookie-revoked") {
      return res.status(401).json({ error: "Session expired" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
