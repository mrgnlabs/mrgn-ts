import * as admin from "firebase-admin";
import * as Sentry from "@sentry/nextjs";
import { NextApiResponse } from "next";
import { PublicKey, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import base58 from "bs58";
import { is } from "superstruct";

import { MEMO_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import {
  firebaseApi,
  SigningMethod,
  STATUS_BAD_REQUEST,
  STATUS_OK,
  STATUS_UNAUTHORIZED,
  STATUS_INTERNAL_ERROR,
} from "@mrgnlabs/mrgn-state";

import { initFirebaseIfNeeded } from "./utils";
import { NextApiRequest } from "../utils";

export type AccountLabelRequest = {
  method: SigningMethod;
  signedDataRaw: string;
  account: string;
  label: string;
};

initFirebaseIfNeeded();

export default async function handler(req: NextApiRequest<AccountLabelRequest>, res: NextApiResponse) {
  if (req.method === "POST") {
    const { method, signedDataRaw, account, label } = req.body;

    let signer;
    let payload;
    try {
      const migrateData = validateAndUnpackAccountLabelData(signedDataRaw, method);
      signer = migrateData.signer.toBase58();
      payload = migrateData.payload;
    } catch (error: any) {
      console.log(error);
      Sentry.captureException(error);
      let status;
      switch (error.message) {
        case "Invalid accountLabel tx":
        case "Invalid accountLabel payload":
          status = STATUS_BAD_REQUEST;
          break;
        case "Invalid signature":
          status = STATUS_UNAUTHORIZED;
          break;
        default:
          status = STATUS_INTERNAL_ERROR;
      }
      return res.status(status).json({ error: error.message });
    }

    const db = admin.firestore();
    const accountLabelsCollection = db.collection("account_labels");

    if (!account || !label) {
      return res.status(STATUS_BAD_REQUEST).json({ success: false, message: "Missing account ID or label" });
    }

    if (label.length > 20) {
      return res.status(STATUS_BAD_REQUEST).json({ success: false, message: "Label maxlen 20 chars" });
    }

    const sanitizedLabel = label.replace(/[^a-zA-Z0-9\s]/g, "").trim();

    try {
      const docRef = accountLabelsCollection.doc(account);
      await docRef.set(
        {
          label: sanitizedLabel,
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

    const db = admin.firestore();
    const accountLabelsCollection = db.collection("account_labels");

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

export function validateAndUnpackAccountLabelData(
  signedAuthDataRaw: string,
  signingMethod: SigningMethod
): { signer: PublicKey; payload: firebaseApi.AccountLabelPayload } {
  let authData: firebaseApi.AccountLabelPayload;
  let signerWallet: PublicKey;
  if (signingMethod === "tx") {
    const tx = Transaction.from(Buffer.from(signedAuthDataRaw, "base64"));
    const isValidSignature = tx.verifySignatures();
    if (!isValidSignature) {
      throw new Error("Invalid signature");
    }

    const memoIx = tx.instructions.find((x) => x.programId.equals(MEMO_PROGRAM_ID));
    const isValidSignupTx =
      !!tx.feePayer &&
      memoIx !== undefined &&
      memoIx.keys.length === 1 &&
      memoIx.keys[0].isSigner &&
      tx.signatures.length === 1 &&
      memoIx.keys[0].pubkey.equals(tx.feePayer);

    if (!isValidSignupTx) throw new Error("Invalid accountLabel tx");

    authData = JSON.parse(memoIx.data.toString("utf8"));
    signerWallet = tx.feePayer!;

    if (!is(authData, firebaseApi.AccountLabelPayloadStruct)) {
      throw new Error("Invalid accountLabel payload");
    }
  } else {
    const { data, signature, signer } = JSON.parse(signedAuthDataRaw);
    const verified = nacl.sign.detached.verify(
      new TextEncoder().encode(JSON.stringify(data)),
      base58.decode(signature),
      base58.decode(signer)
    );
    if (!verified) {
      throw new Error("Invalid signature");
    }

    authData = data;
    signerWallet = new PublicKey(signer);
  }

  return { signer: signerWallet, payload: authData };
}
