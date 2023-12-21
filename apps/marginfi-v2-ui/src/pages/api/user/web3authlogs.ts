import * as admin from "firebase-admin";
import { initFirebaseIfNeeded } from "./utils";
import { NextApiRequest } from "../utils";
import { STATUS_BAD_REQUEST, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";

initFirebaseIfNeeded();

export interface LoginRequest {
  walletAddress: string;
  email: string;
  loginType: string;
}

export default async function handler(req: NextApiRequest<LoginRequest>, res: any) {
  const { walletAddress, email, loginType } = req.body;

  try {
    const db = admin.firestore();
    const loginsCollection = db.collection("web3auth_logs");

    // search for existing record
    const existingLog = await loginsCollection
      .where("walletAddress", "==", walletAddress)
      .where("loginType", "==", loginType)
      .get();

    if (existingLog.docs.length > 0) {
      const docId = existingLog.docs[0].id;
      await loginsCollection.doc(docId).update({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(STATUS_OK).json({ success: true });
    }

    await loginsCollection.add({
      walletAddress,
      email,
      loginType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(STATUS_OK).json({ success: true });
  } catch (error: any) {
    console.error("Error logging log-in attempt:", error);
    return res.status(STATUS_BAD_REQUEST).json({ success: false });
  }
}
