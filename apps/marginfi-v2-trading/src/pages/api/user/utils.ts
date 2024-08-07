import * as admin from "firebase-admin";
import { UserRecord } from "firebase-admin/lib/auth/user-record";
import generatePassword from "omgopass";

export function initFirebaseIfNeeded() {
  // Check if the app is already initialized to avoid initializing multiple times
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  }
}

// function to get the referral code for a given wallet address
// if the wallet address is not in the referral table, then add it with a random code
export async function getReferralCode(walletAddress: string) {
  const db = admin.firestore();
  const user = await db.collection("arena_referrals").doc(walletAddress).get();

  if (!user.exists) {
    const referralCode = generatePassword({
      minSyllableLength: 4,
      maxSyllableLength: 6,
      hasNumbers: false,
      titlecased: false,
      separators: "-",
    });

    await db.collection("arena_referrals").doc(walletAddress).set({ referralCode });
    return referralCode;
  }

  return user.data()?.referralCode;
}

export async function getFirebaseUserByWallet(walletAddress: string): Promise<UserRecord | undefined> {
  try {
    const user = await admin.auth().getUser(walletAddress);
    return user;
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      return undefined;
    }
    throw error;
  }
}

export async function getLastUsedWallet(wallet: string) {
  const db = admin.firestore();
  const user = await db.collection("users").doc(wallet).get();

  if (!user.exists) {
    return "";
  }

  const userData = user.data();
  return userData?.lastUsedWalletId;
}
