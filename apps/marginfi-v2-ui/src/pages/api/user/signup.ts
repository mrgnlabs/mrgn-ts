import * as admin from "firebase-admin";
import * as Sentry from "@sentry/nextjs";
import { createFirebaseUser, getFirebaseUserByWallet, initFirebaseIfNeeded, logSignupAttempt } from "./utils";
import { NextApiRequest } from "../utils";
import { is } from "superstruct";
import { MEMO_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { PublicKey, Transaction } from "@solana/web3.js";
import base58 from "bs58";
import nacl from "tweetnacl";
import {
  SigningMethod,
  STATUS_BAD_REQUEST,
  STATUS_UNAUTHORIZED,
  STATUS_INTERNAL_ERROR,
  STATUS_OK,
  firebaseApi,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { capture, identify } from "~/utils/analytics";

initFirebaseIfNeeded();

export interface SignupRequest {
  walletAddress: string;
  payload: firebaseApi.SignupPayload;
  walletId?: string;
}

export default async function handler(req: NextApiRequest<SignupRequest>, res: any) {
  const { walletAddress, payload, walletId } = req.body;

  Sentry.setContext("signup_args", {
    walletAddress,
  });

  /* signing logic
   try {
    const signupData = validateAndUnpackSignupData(signedAuthDataRaw, method);
    signer = signupData.signer.toBase58();
    payload = signupData.payload;
  } catch (error: any) {
    Sentry.captureException(error);
    let status;
    switch (error.message) {
      case "Invalid signup tx":
      case "Invalid signup payload":
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
    const user = await getFirebaseUserByWallet(walletAddress);
    if (user) {
      Sentry.captureException({ message: "User already exists" });
      return res.status(STATUS_BAD_REQUEST).json({ error: "User already exists" });
    }
  } catch (error: any) {
    Sentry.captureException(error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: error.message }); // An unexpected error occurred
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
