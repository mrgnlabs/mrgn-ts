import { NextApiRequest, NextApiResponse } from "next";
import { initFirebaseIfNeeded } from "../user/utils";
import * as admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
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
    if (error.code === "auth/id-token-expired" || error.code === "auth/id-token-revoked") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
