import { NextApiRequest, NextApiResponse } from "next";
import { initFirebaseIfNeeded } from "../user/utils";
import * as admin from "firebase-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get the session cookie from the request
    const sessionCookie = req.cookies.session || "";
    if (!sessionCookie) {
      return res.status(401).json({ error: "Unauthorized - No session cookie" });
    }

    // Initialize Firebase and verify the session cookie
    initFirebaseIfNeeded();
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    const walletAddress = decodedClaims.uid;

    const db = admin.firestore();

    // Query the user's activities subcollection
    const snapshot = await db
      .collection("activity")
      .doc(walletAddress)
      .collection("activities")
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();

    const activities = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || null,
    }));

    return res.status(200).json({ activities });
  } catch (error: any) {
    console.error("Error fetching activities:", error);
    if (error.code === "auth/session-cookie-expired" || error.code === "auth/session-cookie-revoked") {
      return res.status(401).json({ error: "Session expired" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
