import * as admin from "firebase-admin";
import { NextApiResponse } from "next";

import { STATUS_BAD_REQUEST, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";

import { initFirebaseIfNeeded } from "./utils";
import { NextApiRequest } from "../utils";

initFirebaseIfNeeded();

export type LoginRequest = {
  account: string;
  label: string;
};

export default async function handler(req: NextApiRequest<LoginRequest>, res: NextApiResponse) {
  const db = admin.firestore();
  const accountLabelsCollection = db.collection("account_labels");

  if (req.method === "POST") {
    const { account, label } = req.body;

    if (!account || !label) {
      return res.status(STATUS_BAD_REQUEST).json({ success: false, message: "Missing account ID or label" });
    }

    try {
      const docRef = accountLabelsCollection.doc(account);
      await docRef.set(
        {
          label: account,
          last_updated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.status(STATUS_OK).json({ success: true });
    } catch (error: any) {
      console.error("Error updating account:", error);
      return res.status(STATUS_BAD_REQUEST).json({ success: false });
    }
  } else if (req.method === "GET") {
    const account = req.query.account as string;

    if (!account) {
      return res.status(STATUS_BAD_REQUEST).json({ success: false, message: "Missing account ID" });
    }

    try {
      const docRef = accountLabelsCollection.doc(account);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(STATUS_OK).json({ success: true, data: {} });
      }

      return res.status(STATUS_OK).json({ success: true, data: doc.data() });
    } catch (error: any) {
      console.error("Error fetching account:", error);
      return res.status(STATUS_BAD_REQUEST).json({ success: false });
    }
  } else {
    return res.status(STATUS_BAD_REQUEST).json({ success: false, message: "Invalid request method" });
  }
}
