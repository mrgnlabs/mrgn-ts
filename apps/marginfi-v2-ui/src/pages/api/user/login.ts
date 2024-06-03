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
import { capture, identify } from "~/utils/analytics";

initFirebaseIfNeeded();

export interface LoginRequest {
  walletAddress: string;
  walletId: string;
}

export default async function handler(req: NextApiRequest<LoginRequest>, res: any) {
  const { walletAddress, walletId } = req.body;

  /* signing logic
  let signer;
  try {
    const loginData = validateAndUnpackLoginData(signedAuthDataRaw, method);
    signer = loginData.signer.toBase58();
  } catch (error: any) {
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
  }*/

  try {
    const userResult = await getFirebaseUserByWallet(walletAddress);
    if (userResult === undefined) {
      await logLoginAttempt(walletAddress, null, "", false, walletId);
      Sentry.captureException({ message: "User not found" });
      return res.status(STATUS_NOT_FOUND).json({ error: "User not found" });
    } else {
      await logLoginAttempt(walletAddress, userResult.uid, "", true, walletId);

      capture("user_login", {
        publicKey: walletAddress,
        walletId: walletId,
        uuid: userResult.uid,
      });
      identify(userResult.uid, {
        publicKey: walletAddress,
      });
    }
  } catch (error: any) {
    Sentry.captureException(error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: error.message }); // An unexpected error occurred
  }

  // Generate a custom token for the client to log in
  const customToken = await admin.auth().createCustomToken(walletAddress);

  return res.status(STATUS_OK).json({ status: "success", uid: walletAddress, token: customToken });
}

// -------- Helpers

/**
 * @deprecated
 * Signing functionality
 */
export function validateAndUnpackLoginData(
  signedAuthDataRaw: string,
  signingMethod: SigningMethod
): { signer: PublicKey } {
  let signerWallet: PublicKey;
  if (signingMethod === "tx") {
    const tx = Transaction.from(Buffer.from(signedAuthDataRaw, "base64"));
    const isValidSignature = tx.verifySignatures();
    if (!isValidSignature) {
      throw new Error("Invalid signature");
    }

    const memoIx = tx.instructions.find((x) => x.programId.equals(MEMO_PROGRAM_ID));
    const isValidLoginTx =
      !!tx.feePayer &&
      memoIx !== undefined &&
      memoIx.keys.length === 1 &&
      memoIx.keys[0].isSigner &&
      tx.signatures.length === 1 &&
      memoIx.keys[0].pubkey.equals(tx.feePayer);

    if (!isValidLoginTx) throw new Error("Invalid login tx");

    const authData = JSON.parse(memoIx.data.toString("utf8"));
    signerWallet = tx.feePayer!;

    if (!is(authData, firebaseApi.LoginPayloadStruct)) {
      throw new Error("Invalid login payload");
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

    signerWallet = new PublicKey(signer);
  }

  return { signer: signerWallet };
}
