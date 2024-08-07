import * as admin from "firebase-admin";
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
  const user = await db.collection("arena_referral_codes").doc(walletAddress).get();

  if (!user.exists) {
    const referralCode = generatePassword({
      minSyllableLength: 4,
      maxSyllableLength: 6,
      hasNumbers: false,
      titlecased: false,
      separators: "-",
    });

    await db.collection("arena_referral_codes").doc(walletAddress).set({ referralCode });
    return referralCode;
  }

  return user.data()?.referralCode;
}

// track successful referral
export async function trackReferral(walletAddress: string, referralCode: string) {
  const db = admin.firestore();

  // fetch referral code
  const refCode = await db.collection("arena_referral_codes").where("referralCode", "==", referralCode).get();

  // referral code not found
  if (refCode.size === 0) {
    return false;
  }

  const refData = refCode.docs[0].data();

  // check if user has already been referred
  const referrals = await db.collection("arena_referrals").doc(walletAddress).get();
  if (referrals.exists) {
    return false;
  }

  // add tracked referral
  await db.collection("arena_referrals").doc(walletAddress).set({
    referralCode: refData.referralCode,
    referrerAddress: refCode.docs[0].id,
    createdAt: admin.firestore.Timestamp.now(),
  });

  return true;
}
