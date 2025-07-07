import * as admin from "firebase-admin";
import * as Sentry from "@sentry/nextjs";
import { getFirebaseUserByWallet, initFirebaseIfNeeded, logLoginAttempt } from "./utils";
import { NextApiRequest, NextApiResponse } from "next";
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
} from "@mrgnlabs/mrgn-state";
import { capture, identify } from "@mrgnlabs/mrgn-utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { walletAddress, walletId } = req.body;

    if (!walletAddress) {
      return res.status(STATUS_BAD_REQUEST).json({ error: "Missing required fields" });
    }

    initFirebaseIfNeeded();

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

    // Get the user's custom token
    const customToken = await admin.auth().createCustomToken(walletAddress);

    return res.status(STATUS_OK).json({ token: customToken });
  } catch (error: any) {
    console.error("Error in login:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
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
