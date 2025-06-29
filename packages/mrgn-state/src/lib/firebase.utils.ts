import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, User, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, doc, getDocs, getDoc, DocumentData } from "firebase/firestore";

import { v4 as uuidv4 } from "uuid";
import { BlockhashWithExpiryBlockHeight, Transaction } from "@solana/web3.js";
import { createMemoInstruction } from "@mrgnlabs/mrgn-common";
import { WalletContextState } from "@solana/wallet-adapter-react";
import base58 from "bs58";
import { object, string, optional, Infer } from "superstruct";
import { Wallet } from "@mrgnlabs/mrgn-common";

export const STATUS_OK = 200;
export const STATUS_BAD_REQUEST = 400;
export const STATUS_UNAUTHORIZED = 401;
export const STATUS_NOT_FOUND = 404;
export const STATUS_INTERNAL_ERROR = 500;

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "marginfi-dev.firebaseapp.com",
  projectId: "marginfi-dev",
  storageBucket: "marginfi-dev.appspot.com",
  messagingSenderId: "509588742572",
  appId: "1:509588742572:web:18d74a3ace2f3aa2071a09",
};

export { FIREBASE_CONFIG };

type SigningMethod = "memo" | "tx";

export type { SigningMethod };

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

const LoginPayloadStruct = object({
  uuid: string(),
});
type LoginPayload = Infer<typeof LoginPayloadStruct>;

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

const AccountLabelPayloadStruct = object({
  account: string(),
  label: string(),
});
type AccountLabelPayload = Infer<typeof AccountLabelPayloadStruct>;

/**
 * Check if user exists in Firebase, then login or signup as needed
 * This function is used by the React Query hooks layer via firebase-api.ts
 */
export async function loginOrSignup(walletAddress: string, walletId?: string, referralCode?: string) {
  // Check if user exists directly using Firebase SDK
  const userDocRef = doc(db, "users", walletAddress);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    // User exists, just login
    await login(walletAddress, walletId);
  } else {
    // User doesn't exist, create new account
    await signup(walletAddress, walletId, referralCode);
  }
}

async function login(walletAddress: string, walletId?: string) {
  await loginWithAddress(walletAddress, walletId);
}

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

  return data;
}

async function setAccountLabel(
  signingMethod: SigningMethod,
  blockhash: BlockhashWithExpiryBlockHeight,
  wallet: Wallet,
  account: string,
  label: string
) {
  const signedDataRaw =
    signingMethod === "tx"
      ? await signAccountLabelTx(wallet, account, label, blockhash)
      : await signAccountLabelMemo(wallet, account, label);

  if (!signedDataRaw) return false;

  const response = await fetch("/api/user/account-label", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ method: signingMethod, signedDataRaw, account, label }),
  });

  return response.ok;
}

export {
  signup,
  login,
  migratePoints,
  setAccountLabel,
  LoginPayloadStruct,
  SignupPayloadStruct,
  MigratePayloadStruct,
  AccountLabelPayloadStruct,
};
export type { UserData, LoginPayload, SignupPayload, MigratePayload, AccountLabelPayload };

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

  // Sign in with custom token to get ID token
  await signinFirebaseAuth(data.token);

  // Get the ID token
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Failed to get ID token");

  // Create session cookie
  const sessionResponse = await fetch("/api/user/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (!sessionResponse.ok) {
    throw new Error("Failed to create session");
  }
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

  // Sign in with custom token to get ID token
  await signinFirebaseAuth(data.token);

  // Get the ID token
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Failed to get ID token");

  // Create session cookie
  const sessionResponse = await fetch("/api/user/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (!sessionResponse.ok) {
    throw new Error("Failed to create session");
  }
}

async function signMigrateMemo(wallet: Wallet, migrateData: MigratePayload): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected!");
  }
  if (!wallet.signMessage) {
    throw new Error("Current wallet does not support required action: `signMessage`");
  }

  const encodedMessage = new TextEncoder().encode(JSON.stringify(migrateData));
  // phantom window provider returns { signature: Uint8Array }
  // wallet adapter returns Uint8Array
  const signature = (await wallet.signMessage(encodedMessage)) as Uint8Array | { signature: Uint8Array };
  const signedData = JSON.stringify({
    data: migrateData,
    signature: base58.encode("signature" in signature ? signature.signature : signature),
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

async function signAccountLabelMemo(wallet: Wallet, account: string, label: string): Promise<string | boolean> {
  if (!wallet.publicKey || !wallet.signMessage) return false;

  try {
    const encodedMessage = new TextEncoder().encode(JSON.stringify({ account, label }));
    const signatureResult = await wallet.signMessage(encodedMessage);

    if (!signatureResult) return false;

    // phantom window provider returns { signature: ArrayBuffer }
    // wallet adapter returns Uint8Array
    let signatureArray: Uint8Array;
    if (signatureResult instanceof Uint8Array) {
      signatureArray = signatureResult;
    } else {
      const phantomSignatureResult = signatureResult as { signature: ArrayBuffer };
      signatureArray = new Uint8Array(phantomSignatureResult.signature);
    }

    const signedData = JSON.stringify({
      data: { account, label },
      signature: base58.encode(signatureArray),
      signer: wallet.publicKey.toBase58(),
    });

    return signedData;
  } catch (error) {
    console.error("Error signing account label memo: ", error);
    return false;
  }
}

async function signAccountLabelTx(
  wallet: Wallet,
  account: string,
  label: string,
  blockhash: BlockhashWithExpiryBlockHeight
): Promise<string | boolean> {
  try {
    const walletAddress = wallet.publicKey!;
    const authDummyTx = new Transaction().add(
      createMemoInstruction(JSON.stringify({ account, label }), [walletAddress])
    );

    authDummyTx.feePayer = walletAddress;
    authDummyTx.recentBlockhash = blockhash.blockhash;
    authDummyTx.lastValidBlockHeight = blockhash.lastValidBlockHeight;

    if (!wallet.signTransaction) {
      return false;
    }

    const signedAuthDummyTx = await wallet.signTransaction(authDummyTx);

    if (!signedAuthDummyTx) return false;

    let signedData = signedAuthDummyTx.serialize().toString("base64");

    return signedData;
  } catch (error) {
    console.error("Error signing account label tx: ", error);
    return false;
  }
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

// ----------------------------------------------------------------------------
// Firebase Auth Utilities for React Query
// ----------------------------------------------------------------------------

/**
 * Subscribe to Firebase auth state changes
 */
export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// ----------------------------------------------------------------------------
