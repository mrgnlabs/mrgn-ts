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

async function loginOrSignup(walletAddress: string, walletId?: string, referralCode?: string) {
  const user = await getUser(walletAddress);

  if (user) {
    await login(walletAddress, walletId);
  } else {
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
  getUser,
  loginOrSignup,
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

async function signAccountLabelMemo(wallet: Wallet, account: string, label: string): Promise<string | boolean> {
  if (!wallet.publicKey || !wallet.signMessage) return false;

  try {
    const encodedMessage = new TextEncoder().encode(JSON.stringify({ account, label }));
    const signature = await wallet.signMessage(encodedMessage);

    if (!signature) return false;

    const signedData = JSON.stringify({
      data: { account, label },
      signature: base58.encode(signature as Uint8Array),
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
