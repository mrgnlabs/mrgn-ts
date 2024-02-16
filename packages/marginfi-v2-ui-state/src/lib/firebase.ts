import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  STATUS_BAD_REQUEST,
  STATUS_INTERNAL_ERROR,
  STATUS_NOT_FOUND,
  STATUS_OK,
  STATUS_UNAUTHORIZED,
} from "../constants";
import { SigningMethod } from "../types";
import { v4 as uuidv4 } from "uuid";
import { BlockhashWithExpiryBlockHeight, Transaction } from "@solana/web3.js";
import { createMemoInstruction } from "@mrgnlabs/mrgn-common";
import { WalletContextState } from "@solana/wallet-adapter-react";
import base58 from "bs58";
import { object, string, optional, Infer } from "superstruct";
import { FIREBASE_CONFIG } from "../config";
import { Wallet } from "@mrgnlabs/mrgn-common";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };

// ----------------------------------------------------------------------------
// Points auth API
// ----------------------------------------------------------------------------

interface UserData {
  id: string;
}

async function loginOrSignup(walletAddress: string, walletId?: string, referralCode?: string) {
  const user = await getUser(walletAddress);

  if (user) {
    await login(walletAddress, walletId);
  } else {
    await signup(walletAddress, walletId, referralCode);
  }
}

async function getUser(walletAddress: string): Promise<UserData | undefined> {
  const response = await fetch("/api/user/get", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ wallet: walletAddress }),
  });

  if (response.status === STATUS_OK) {
    // User found
    const { user } = await response.json();
    return user;
  } else if (response.status === STATUS_NOT_FOUND) {
    // User not found
    return undefined;
  } else {
    // Error
    const { error } = await response.json();
    throw new Error(`Failed to fetch user: ${error}`);
  }
}

const LoginPayloadStruct = object({
  uuid: string(),
});
type LoginPayload = Infer<typeof LoginPayloadStruct>;

async function login(walletAddress: string, walletId?: string) {
  await loginWithAddress(walletAddress, walletId);
}

const SignupPayloadStruct = object({
  uuid: string(),
  referralCode: optional(string()),
});
type SignupPayload = Infer<typeof SignupPayloadStruct>;

const MigratePayloadStruct = object({
  fromWalletAddress: string(),
  toWalletAddress: string(),
});
type MigratePayload = Infer<typeof MigratePayloadStruct>;

async function signup(walletAddress: string, walletId?: string, referralCode?: string) {
  if (referralCode !== undefined && typeof referralCode !== "string") {
    throw new Error("Invalid referral code provided.");
  }

  const uuid = uuidv4();
  const authData: SignupPayload = {
    uuid,
    referralCode,
  };

  await signupWithAddress(walletAddress, authData, walletId);
}

async function migratePoints(
  signingMethod: SigningMethod,
  blockhash: BlockhashWithExpiryBlockHeight,
  wallet: Wallet,
  toWalletAddress: string
) {
  const authData: MigratePayload = {
    fromWalletAddress: wallet.publicKey!.toBase58(),
    toWalletAddress,
  };
  const signedDataRaw =
    signingMethod === "tx" ? await signMigrateTx(wallet, authData, blockhash) : await signMigrateMemo(wallet, authData);

  const response = await fetch("/api/user/migrate-points", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ method: signingMethod, signedDataRaw }),
  });
  const data = await response.json();

  console.log(response.status, data);

  return data;
}

export {
  getUser,
  loginOrSignup,
  signup,
  login,
  migratePoints,
  SignupPayloadStruct,
  LoginPayloadStruct,
  MigratePayloadStruct,
};
export type { UserData, SignupPayload, MigratePayload };

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

async function signupWithAddress(walletAddress: string, payload: SignupPayload, walletId?: string) {
  const response = await fetch("/api/user/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ walletAddress, payload, walletId }),
  });
  const data = await response.json();

  switch (response.status) {
    case STATUS_BAD_REQUEST:
      throw new Error(data.error);
    case STATUS_UNAUTHORIZED:
    case STATUS_INTERNAL_ERROR:
      throw new Error("Something went wrong during sign-up");
    default: {
    }
  }

  if (!data.token) throw new Error("Something went wrong during sign-up");
  await signinFirebaseAuth(data.token);
}

async function loginWithAddress(walletAddress: string, walletId?: string) {
  const response = await fetch("/api/user/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ walletAddress, walletId }),
  });
  const data = await response.json();

  if (!data.token) throw new Error("Something went wrong during sign-in");
  await signinFirebaseAuth(data.token);
}

async function signMigrateMemo(wallet: Wallet, migrateData: MigratePayload): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected!");
  }
  if (!wallet.signMessage) {
    throw new Error("Current wallet does not support required action: `signMessage`");
  }

  const encodedMessage = new TextEncoder().encode(JSON.stringify(migrateData));
  const signature = await wallet.signMessage(encodedMessage);
  const signedData = JSON.stringify({
    data: migrateData,
    signature: base58.encode(signature as Uint8Array),
    signer: wallet.publicKey.toBase58(),
  });

  return signedData;
}

async function signMigrateTx(
  wallet: Wallet,
  migrateData: MigratePayload,
  blockhash: BlockhashWithExpiryBlockHeight
): Promise<string> {
  const walletAddress = wallet.publicKey!;
  const authDummyTx = new Transaction().add(createMemoInstruction(JSON.stringify(migrateData), [walletAddress]));

  authDummyTx.feePayer = walletAddress;
  authDummyTx.recentBlockhash = blockhash.blockhash;
  authDummyTx.lastValidBlockHeight = blockhash.lastValidBlockHeight;

  if (!wallet.signTransaction) {
    throw new Error("Current wallet does not support required action: `signTransaction`");
  }

  const signedAuthDummyTx = await wallet.signTransaction(authDummyTx);
  let signedData = signedAuthDummyTx.serialize().toString("base64");

  return signedData;
}

/**
 * @deprecated
 * Signing functionality
 */
async function signupWithAuthData(signingMethod: SigningMethod, signedAuthDataRaw: string) {
  const response = await fetch("/api/user/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ method: signingMethod, signedAuthDataRaw }),
  });
  const data = await response.json();

  switch (response.status) {
    case STATUS_BAD_REQUEST:
      throw new Error(data.error);
    case STATUS_UNAUTHORIZED:
    case STATUS_INTERNAL_ERROR:
      throw new Error("Something went wrong during sign-up");
    default: {
    }
  }

  if (!data.token) throw new Error("Something went wrong during sign-up");
  await signinFirebaseAuth(data.token);
}

/**
 * @deprecated
 * Signing functionality
 */
async function loginWithAuthData(signingMethod: SigningMethod, signedAuthDataRaw: string) {
  const response = await fetch("/api/user/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ method: signingMethod, signedAuthDataRaw }),
  });
  const data = await response.json();

  if (!data.token) throw new Error("Something went wrong during sign-in");
  await signinFirebaseAuth(data.token);
}

/**
 * @deprecated
 * Signing functionality
 */
async function signSignupMemo(wallet: Wallet, authData: SignupPayload): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected!");
  }
  if (!wallet.signMessage) {
    throw new Error("Current wallet does not support required action: `signMessage`");
  }

  const encodedMessage = new TextEncoder().encode(JSON.stringify(authData));
  const signature = await wallet.signMessage(encodedMessage);
  const signedData = JSON.stringify({
    data: authData,
    signature: base58.encode(signature as Uint8Array),
    signer: wallet.publicKey.toBase58(),
  });

  return signedData;
}

/**
 * @deprecated
 * Signing functionality
 */
async function signSignupTx(
  wallet: Wallet,
  authData: SignupPayload,
  blockhash: BlockhashWithExpiryBlockHeight
): Promise<string> {
  const walletAddress = wallet.publicKey!;
  const authDummyTx = new Transaction().add(createMemoInstruction(JSON.stringify(authData), [walletAddress]));
  authDummyTx.feePayer = walletAddress;
  authDummyTx.recentBlockhash = blockhash.blockhash;
  authDummyTx.lastValidBlockHeight = blockhash.lastValidBlockHeight;

  if (!wallet.signTransaction) {
    throw new Error("Current wallet does not support required action: `signTransaction`");
  }

  const signedAuthDummyTx = await wallet.signTransaction(authDummyTx);
  let signedData = signedAuthDummyTx.serialize().toString("base64");

  return signedData;
}

/**
 * @deprecated
 * Signing functionality
 */
async function signLoginMemo(wallet: Wallet, authData: LoginPayload): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected!");
  }
  if (!wallet.signMessage) {
    throw new Error("Current wallet does not support required action: `signMessage`");
  }

  const encodedMessage = new TextEncoder().encode(JSON.stringify(authData));
  const signature = await wallet.signMessage(encodedMessage);
  const signedData = JSON.stringify({
    data: authData,
    signature: base58.encode(signature as Uint8Array),
    signer: wallet.publicKey.toBase58(),
  });

  return signedData;
}

/**
 * @deprecated
 * Signing functionality
 */
async function signLoginTx(
  wallet: Wallet,
  authData: LoginPayload,
  blockhash: BlockhashWithExpiryBlockHeight
): Promise<string> {
  const walletAddress = wallet.publicKey!;
  const authDummyTx = new Transaction().add(createMemoInstruction(JSON.stringify(authData), [walletAddress]));
  authDummyTx.feePayer = walletAddress;
  authDummyTx.recentBlockhash = blockhash.blockhash;
  authDummyTx.lastValidBlockHeight = blockhash.lastValidBlockHeight;

  if (!wallet.signTransaction) {
    throw new Error("Current wallet does not support required action: `signTransaction`");
  }

  const signedAuthDummyTx = await wallet.signTransaction(authDummyTx);
  let signedData = signedAuthDummyTx.serialize().toString("base64");

  return signedData;
}

async function signinFirebaseAuth(token: string) {
  try {
    await signInWithCustomToken(auth, token);
  } catch (error: any) {
    console.error("Error signing in with custom token: ", error);
    if (error.code === "auth/network-request-failed") {
      // @todo need to give user better experience here
      throw new Error(
        "It appears there was a network error. Please check your internet connection and try again. If the problem persists, please try again later."
      );
    } else {
      throw new Error("An error occurred while signing in. Please try again later.");
    }
  }
}
