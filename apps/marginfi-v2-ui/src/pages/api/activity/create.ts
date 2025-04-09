import { NextApiRequest, NextApiResponse } from "next";
import { initFirebaseIfNeeded } from "../user/utils";
import * as admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { type, details } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Initialize Firebase and verify the ID token
    initFirebaseIfNeeded();
    const decodedToken = await getAuth().verifyIdToken(idToken);

    // The wallet address is the UID in Firebase
    const walletAddress = decodedToken.uid;

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
      });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error creating activity:", error);
    if (error.code === "auth/id-token-expired" || error.code === "auth/id-token-revoked") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
