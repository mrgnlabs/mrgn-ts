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

  let signer;
  let payload;
  try {
    const loginData = validateAndUnpackMigrateData(signedDataRaw, method);
    signer = loginData.signer.toBase58();
    payload = loginData.payload;
  } catch (error: any) {
    console.log(error);
    Sentry.captureException(error);
    let status;
    switch (error.message) {
      case "Invalid migration tx":
      case "Invalid migration payload":
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
    const fromWalletAddress = signer;
    const toWalletAddress = payload.toWalletAddress;

    // check user wallet is on whitelist
    const wl = process.env.POINTS_MIGRATION_WHITELIST ? process.env.POINTS_MIGRATION_WHITELIST.split(",") : [];
    if (!wl.includes(fromWalletAddress)) {
      console.log(`User ${fromWalletAddress} is not on the whitelist.`);
      return res.status(STATUS_BAD_REQUEST).json({ error: "User not on whitelist" });
    }

    // Check for existing migration involving the fromAddress or toAddress
    const existingMigrationQuery = await admin
      .firestore()
      .collection("points_migrations")
      .where("from_address", "in", [fromWalletAddress, toWalletAddress])
      .get();

    const existingMigrationAsTargetQuery = await admin
      .firestore()
      .collection("points_migrations")
      .where("to_address", "in", [fromWalletAddress, toWalletAddress])
      .get();

    if (!existingMigrationQuery.empty || !existingMigrationAsTargetQuery.empty) {
      console.log(
        `Either the fromAddress ${fromWalletAddress} or the toAddress ${toWalletAddress} has already been involved in a migration.`
      );
      return res
        .status(STATUS_BAD_REQUEST)
        .json({ error: "One of the wallets has already been involved in a migration." });
    }

    const migrationDoc = {
      from_address: fromWalletAddress,
      to_address: toWalletAddress,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection("points_migrations").add(migrationDoc);
    console.log(`Migration from ${fromWalletAddress} to ${toWalletAddress} recorded.`);

    // Return a success response
    return res.status(STATUS_OK).json({ status: "success", message: "Points migration recorded successfully." });
  } catch (error: any) {
    Sentry.captureException(error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: error.message });
  }
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

    if (!isValidSignupTx) throw new Error("Invalid migration tx");

    authData = JSON.parse(memoIx.data.toString("utf8"));
    signerWallet = tx.feePayer!;

    if (!is(authData, firebaseApi.MigratePayloadStruct)) {
      throw new Error("Invalid migration payload");
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
