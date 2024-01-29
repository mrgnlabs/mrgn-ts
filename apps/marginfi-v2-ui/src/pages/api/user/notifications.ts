import * as admin from "firebase-admin";
import { NextApiResponse } from "next";

import { STATUS_BAD_REQUEST, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";

import { initFirebaseIfNeeded } from "./utils";
import { NextApiRequest } from "../utils";

initFirebaseIfNeeded();

export type LoginRequest = {
  walletAddress: string;
  email: string;
  productUpdates: boolean;
  accountHealth: boolean;
};

export default async function handler(req: NextApiRequest<LoginRequest>, res: NextApiResponse) {
  const db = admin.firestore();
  const notisCollection = db.collection("notification_settings");

  if (req.method === "POST") {
    const { email, walletAddress, productUpdates, accountHealth } = req.body;

    try {
      const docRef = notisCollection.doc(walletAddress);
      await docRef.set(
        {
          email,
          wallet_address: walletAddress,
          product_updates: productUpdates,
          account_health: accountHealth,
          last_updated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.status(STATUS_OK).json({ success: true });
    } catch (error: any) {
      console.error("Error updating notifications settings:", error);
      return res.status(STATUS_BAD_REQUEST).json({ success: false });
    }
  } else if (req.method === "GET") {
    const walletAddress = req.query.walletAddress as string;

    if (!walletAddress) {
      return res.status(STATUS_BAD_REQUEST).json({ success: false, message: "Missing wallet address" });
    }

    try {
      const docRef = notisCollection.doc(walletAddress);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(STATUS_BAD_REQUEST).json({ success: false, message: "Document not found" });
      }

      return res.status(STATUS_OK).json({ success: true, data: doc.data() });
    } catch (error: any) {
      console.error("Error fetching document:", error);
      return res.status(STATUS_BAD_REQUEST).json({ success: false });
    }
  } else {
    return res.status(STATUS_BAD_REQUEST).json({ success: false, message: "Invalid request method" });
  }
}
