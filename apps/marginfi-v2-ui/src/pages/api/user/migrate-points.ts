import * as admin from "firebase-admin";
import * as Sentry from "@sentry/nextjs";
import { getFirebaseUserByWallet, initFirebaseIfNeeded, logLoginAttempt } from "./utils";
import { NextApiRequest } from "../utils";
import { MEMO_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { PublicKey, Transaction } from "@solana/web3.js";
import base58 from "bs58";
import { is } from "superstruct";
import nacl from "tweetnacl";
import {
  SigningMethod,
  STATUS_BAD_REQUEST,
  STATUS_UNAUTHORIZED,
  STATUS_INTERNAL_ERROR,
  STATUS_NOT_FOUND,
  STATUS_OK,
  firebaseApi,
} from "@mrgnlabs/marginfi-v2-ui-state";

initFirebaseIfNeeded();

export interface MigrationRequest {
  method: SigningMethod;
  signedDataRaw: string;
}

export default async function handler(req: NextApiRequest<MigrationRequest>, res: any) {
  const { method, signedDataRaw } = req.body;

  console.log(1);

  let signer;
  try {
    console.log(2);
    console.log(signedDataRaw);
    const loginData = validateAndUnpackMigrateData(signedDataRaw, method);
    signer = loginData.signer.toBase58();
    console.log(signer);
  } catch (error: any) {
    console.log(error);
    Sentry.captureException(error);
    let status;
    switch (error.message) {
      case "Invalid login tx":
      case "Invalid login payload":
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

  try {
    console.log("we made it to here");
  } catch (error: any) {
    Sentry.captureException(error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: error.message }); // An unexpected error occurred
  }

  return res.status(STATUS_OK).json({ status: "success" });
}

// -------- Helpers
export function validateAndUnpackMigrateData(
  signedAuthDataRaw: string,
  signingMethod: SigningMethod
): { signer: PublicKey; payload: firebaseApi.MigratePayload } {
  let authData: firebaseApi.MigratePayload;
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

    if (!isValidSignupTx) throw new Error("Invalid signup tx");

    authData = JSON.parse(memoIx.data.toString("utf8"));
    signerWallet = tx.feePayer!;

    if (!is(authData, firebaseApi.SignupPayloadStruct)) {
      throw new Error("Invalid signup payload");
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
