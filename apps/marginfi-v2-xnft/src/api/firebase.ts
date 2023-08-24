// // import { initializeApp } from "firebase/app";
// // import { getAuth, signInWithCustomToken } from "firebase/auth";
// // import { getFirestore } from "firebase/firestore";
// import firestore from '@react-native-firebase/firestore';
// import firebase from '@react-native-firebase/app';
// import {
//   STATUS_BAD_REQUEST,
//   STATUS_INTERNAL_ERROR,
//   STATUS_NOT_FOUND,
//   STATUS_OK,
//   STATUS_UNAUTHORIZED,
//   SigningMethod,
// } from "~/pages/api/user/utils";
// import { v4 as uuidv4 } from "uuid";
// import { BlockhashWithExpiryBlockHeight, Transaction } from "@solana/web3.js";
// import { createMemoInstruction } from "@mrgnlabs/mrgn-common";
// import { WalletContextState } from "@solana/wallet-adapter-react";
// import base58 from "bs58";
// import { object, string, optional, Infer } from "superstruct";

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBPAKOn7YKvEHg6iXTRbyZws3G4kPhWjtQ",
  authDomain: "marginfi-dev.firebaseapp.com",
  projectId: "marginfi-dev",
  storageBucket: "marginfi-dev.appspot.com",
  messagingSenderId: "509588742572",
  appId: "1:509588742572:web:18d74a3ace2f3aa2071a09",
  // databaseURL: "https://xxxxx.firebaseio.com",
};

const firebaseApp = initializeApp(FIREBASE_CONFIG);
export const firebaseDb = getFirestore(firebaseApp);
const firebaseAuth = getAuth(firebaseApp);

// const firebaseApp = await firebase.initializeApp(FIREBASE_CONFIG);
// const firebaseDb = firestore(firebaseApp) // getFirestore(firebaseApp);
// const firebaseAuth = getAuth(firebaseApp);

// export const firebaseApp = async () => await firebase.initializeApp(FIREBASE_CONFIG)

// export interface UserData {
//   id: string;
// }

// export const SignupPayloadStruct = object({
//   uuid: string(),
//   referralCode: optional(string()),
// });
// export type SignupPayload = Infer<typeof SignupPayloadStruct>;

// export const LoginPayloadStruct = object({
//   uuid: string(),
// });
// export type LoginPayload = Infer<typeof LoginPayloadStruct>;

// async function getUser(walletAddress: string): Promise<UserData | undefined> {
//   const response = await fetch("/api/user/get", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ wallet: walletAddress }),
//   });

//   if (response.status === STATUS_OK) {
//     // User found
//     const { user } = await response.json();
//     return user;
//   } else if (response.status === STATUS_NOT_FOUND) {
//     // User not found
//     return undefined;
//   } else {
//     // Error
//     const { error } = await response.json();
//     throw new Error(`Failed to fetch user: ${error}`);
//   }
// }

// async function loginWithAuthData(signingMethod: SigningMethod, signedAuthDataRaw: string) {
//   const response = await fetch("/api/user/login", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ method: signingMethod, signedAuthDataRaw }),
//   });
//   const data = await response.json();

//   if (!data.token) throw new Error("Something went wrong during sign-in");
//   await signinFirebaseAuth(data.token);
// }

// async function login(
//   wallet: WalletContextState,
//   signingMethod: SigningMethod,
//   blockhash: BlockhashWithExpiryBlockHeight
// ): Promise<{ signingMethod: SigningMethod; signedAuthDataRaw: string }> {
//   const authData = { uuid: uuidv4() };
//   const signedAuthDataRaw =
//     signingMethod === "tx" ? await signLoginTx(wallet, authData, blockhash) : await signLoginMemo(wallet, authData);
//   await loginWithAuthData(signingMethod, signedAuthDataRaw);

//   return { signingMethod, signedAuthDataRaw };
// }

// async function signup(
//   wallet: WalletContextState,
//   signingMethod: SigningMethod,
//   blockhash: BlockhashWithExpiryBlockHeight,
//   referralCode?: string
// ): Promise<{ signingMethod: SigningMethod; signedAuthDataRaw: string }> {
//   if (referralCode !== undefined && typeof referralCode !== "string") {
//     throw new Error("Invalid referral code provided.");
//   }

//   const uuid = uuidv4();
//   const authData: SignupPayload = {
//     uuid,
//     referralCode,
//   };
//   const signedAuthDataRaw =
//     signingMethod === "tx" ? await signSignupTx(wallet, authData, blockhash) : await signSignupMemo(wallet, authData);

//   const response = await fetch("/api/user/signup", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ signedAuthDataRaw }),
//   });
//   const data = await response.json();

//   switch (response.status) {
//     case STATUS_BAD_REQUEST:
//       throw new Error(data.error);
//     case STATUS_UNAUTHORIZED:
//     case STATUS_INTERNAL_ERROR:
//       throw new Error("Something went wrong during sign-up");
//     default: {
//     }
//   }

//   if (!data.token) throw new Error("Something went wrong during sign-up");
//   await signinFirebaseAuth(data.token);

//   return { signingMethod, signedAuthDataRaw };
// }

// async function signSignupMemo(wallet: WalletContextState, authData: SignupPayload): Promise<string> {
//   if (!wallet.publicKey) {
//     throw new Error("Wallet not connected!");
//   }
//   if (!wallet.signMessage) {
//     throw new Error("Current wallet does not support required action: `signMessage`");
//   }

//   const encodedMessage = new TextEncoder().encode(JSON.stringify(authData));
//   const signature = await wallet.signMessage(encodedMessage);
//   const signedData = JSON.stringify({
//     data: authData,
//     signature: base58.encode(signature),
//     signer: wallet.publicKey.toBase58(),
//   });

//   return signedData;
// }

// async function signSignupTx(
//   wallet: WalletContextState,
//   authData: SignupPayload,
//   blockhash: BlockhashWithExpiryBlockHeight
// ): Promise<string> {
//   const walletAddress = wallet.publicKey!;
//   const authDummyTx = new Transaction().add(createMemoInstruction(JSON.stringify(authData), [walletAddress]));
//   authDummyTx.feePayer = walletAddress;
//   authDummyTx.recentBlockhash = blockhash.blockhash;
//   authDummyTx.lastValidBlockHeight = blockhash.lastValidBlockHeight;

//   if (!wallet.signTransaction) {
//     throw new Error("Current wallet does not support required action: `signTransaction`");
//   }

//   const signedAuthDummyTx = await wallet.signTransaction(authDummyTx);
//   let signedData = signedAuthDummyTx.serialize().toString("base64");

//   return signedData;
// }

// async function signLoginMemo(wallet: WalletContextState, authData: LoginPayload): Promise<string> {
//   if (!wallet.publicKey) {
//     throw new Error("Wallet not connected!");
//   }
//   if (!wallet.signMessage) {
//     throw new Error("Current wallet does not support required action: `signMessage`");
//   }

//   const encodedMessage = new TextEncoder().encode(JSON.stringify(authData));
//   const signature = await wallet.signMessage(encodedMessage);
//   const signedData = JSON.stringify({
//     data: authData,
//     signature: base58.encode(signature),
//     signer: wallet.publicKey.toBase58(),
//   });

//   return signedData;
// }

// async function signLoginTx(
//   wallet: WalletContextState,
//   authData: LoginPayload,
//   blockhash: BlockhashWithExpiryBlockHeight
// ): Promise<string> {
//   const walletAddress = wallet.publicKey!;
//   const authDummyTx = new Transaction().add(createMemoInstruction(JSON.stringify(authData), [walletAddress]));
//   authDummyTx.feePayer = walletAddress;
//   authDummyTx.recentBlockhash = blockhash.blockhash;
//   authDummyTx.lastValidBlockHeight = blockhash.lastValidBlockHeight;

//   if (!wallet.signTransaction) {
//     throw new Error("Current wallet does not support required action: `signTransaction`");
//   }

//   const signedAuthDummyTx = await wallet.signTransaction(authDummyTx);
//   let signedData = signedAuthDummyTx.serialize().toString("base64");

//   return signedData;
// }

// async function signinFirebaseAuth(token: string) {
//   try {
//     await signInWithCustomToken(firebaseAuth, token);
//     console.log("Signed user in.");
//   } catch (error: any) {
//     console.error("Error signing in with custom token: ", error);
//     if (error.code === "auth/network-request-failed") {
//       // @todo need to give user better experience here
//       throw new Error(
//         "It appears there was a network error. Please check your internet connection and try again. If the problem persists, please try again later."
//       );
//     } else {
//       throw new Error("An error occurred while signing in. Please try again later.");
//     }
//   }
// }

// export { getUser, signup, login, loginWithAuthData };
