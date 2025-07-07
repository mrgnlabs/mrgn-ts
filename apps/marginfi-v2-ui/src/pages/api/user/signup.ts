import * as admin from "firebase-admin";
import * as Sentry from "@sentry/nextjs";
import { createFirebaseUser, getFirebaseUserByWallet, initFirebaseIfNeeded, logSignupAttempt } from "./utils";
import { NextApiRequest, NextApiResponse } from "next";
import { is } from "superstruct";
import { MEMO_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { PublicKey, Transaction } from "@solana/web3.js";
import base58 from "bs58";
import nacl from "tweetnacl";
import { SigningMethod, STATUS_BAD_REQUEST, STATUS_INTERNAL_ERROR, STATUS_OK, firebaseApi } from "@mrgnlabs/mrgn-state";
import { capture, identify } from "@mrgnlabs/mrgn-utils";

initFirebaseIfNeeded();

interface SignupRequestBody {
  walletAddress: string;
  payload: firebaseApi.SignupPayload;
  walletId?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { walletAddress, payload, walletId } = req.body as SignupRequestBody;

  Sentry.setContext("signup_args", {
    walletAddress,
  });

  try {
    const user = await getFirebaseUserByWallet(walletAddress);
    if (user) {
      return res.status(STATUS_BAD_REQUEST).json({ error: "User already exists" });
    }
  } catch (error: any) {
    return res.status(STATUS_INTERNAL_ERROR).json({ error: error.message });
  }

  try {
    await createFirebaseUser(walletAddress, payload.referralCode);
    console.log("successfully created new user");
  } catch (createUserError: any) {
    Sentry.captureException(createUserError);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: createUserError.message });
  }

  await logSignupAttempt(walletAddress, payload.uuid, "", true, walletId);
  capture("user_login", {
    publicKey: walletAddress,
    uuid: payload.uuid,
    walletId,
  });
  identify(payload.uuid, {
    publicKey: walletAddress,
  });

  // Generate a custom token for the client to sign in
  const customToken = await admin.auth().createCustomToken(walletAddress);

  // Create a session cookie
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  const sessionCookie = await admin.auth().createSessionCookie(customToken, { expiresIn });

  // Set the session cookie
  res.setHeader(
    "Set-Cookie",
    `session=${sessionCookie}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${expiresIn / 1000}`
  );

  return res.status(STATUS_OK).json({ status: "success", uid: walletAddress, token: customToken });
}

// -------- Helpers

/**
 * @deprecated
 * Signing functionality
 */
export function validateAndUnpackSignupData(
  signedAuthDataRaw: string,
  signingMethod: SigningMethod
): { signer: PublicKey; payload: firebaseApi.SignupPayload } {
  let authData: firebaseApi.SignupPayload;
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
