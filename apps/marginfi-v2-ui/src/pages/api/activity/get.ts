import { NextApiRequest, NextApiResponse } from "next";
import { initFirebaseIfNeeded } from "../user/utils";
import * as admin from "firebase-admin";
import { STATUS_INTERNAL_ERROR, STATUS_OK, STATUS_UNAUTHORIZED } from "@mrgnlabs/mrgn-state";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get the session cookie from the request
    const sessionCookie = req.cookies.session || "";
    if (!sessionCookie) {
      return res.status(STATUS_UNAUTHORIZED).json({ error: "Unauthorized - No session cookie" });
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

    // Get all unique account addresses from activities
    const accountAddresses = new Set<string>();
    const activities = snapshot.docs.map((doc) => {
      const data = doc.data();
      if (data.account) {
        accountAddresses.add(data.account);
      }
      return {
        id: doc.id,
        ...data,
        account: data.account,
        timestamp: data.timestamp?.toDate() || null,
      };
    });

    // Fetch account labels for all accounts
    const accountLabelsPromises = Array.from(accountAddresses).map(async (account) => {
      const labelDoc = await db.collection("account_labels").doc(account).get();
      return {
        account,
        label: labelDoc.exists ? labelDoc.data()?.label : null,
      };
    });

    const accountLabels = await Promise.all(accountLabelsPromises);
    const accountLabelsMap = new Map(accountLabels.map(({ account, label }) => [account, label]));

    // Add labels to activities
    const activitiesWithLabels = activities.map((activity) => ({
      ...activity,
      accountLabel: activity.account ? accountLabelsMap.get(activity.account) : null,
    }));

    // cache for 4 hours
    res.setHeader("Cache-Control", "s-maxage=14400, stale-while-revalidate=300");
    return res.status(STATUS_OK).json({ activities: activitiesWithLabels });
  } catch (error: any) {
    console.error("Error fetching activities:", error);
    if (error.code === "auth/session-cookie-expired" || error.code === "auth/session-cookie-revoked") {
      return res.status(STATUS_UNAUTHORIZED).json({ error: "Session expired" });
    }
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
