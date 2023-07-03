import * as admin from 'firebase-admin';
import { Transaction } from '@solana/web3.js';
import { v4 as uuidv4 } from "uuid";
import { MEMO_PROGRAM_ID } from '@mrgnlabs/mrgn-common';

// Check if the app is already initialized to avoid initializing multiple times
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

const logAttempt = async (publicKey: string, uuid: string, signature: string, successful: boolean) => {
  try {
    const db = admin.firestore();
    const loginsCollection = db.collection('logins');
    await loginsCollection.add({
      publicKey,
      uuid,
      signature,
      successful,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error logging attempt:', error);
  }
};

export interface AuthData {
  uuid: string;
  referralCode: string | undefined;
}

export default async function handler(req: any, res: any) {
  const { signedData } = req.body;

  if (!signedData) {
    return res.status(400).json({ error: 'signedData required' });
  }

  const tx = Transaction.from(Buffer.from(signedData, "base64"));

  const isValidAuthTx =
    tx.feePayer !== undefined &&
    tx.instructions[0] !== undefined &&
    tx.instructions[0].programId.equals(MEMO_PROGRAM_ID) &&
    tx.instructions[0].keys.length === 1 &&
    tx.instructions[0].keys[0].isSigner &&
    tx.signatures.length === 1;

  if (!isValidAuthTx) {
    return res.status(401).json({ error: 'Invalid auth data' });
  }

  let walletPublicKey = tx.feePayer!.toBase58();
  const authData: AuthData = JSON.parse(
    tx.instructions[0].data.toString("utf8")
  );

  try {
    const isValidSignature = tx.verifySignatures();
    if (!isValidSignature) {
      await logAttempt(walletPublicKey, authData.uuid, signedData, false);
      return res.status(402).json({ error: 'Invalid signature' });
    }

    // Try to get the user with the given uid
    await admin.auth().getUser(walletPublicKey);
  } catch (error: any) {
    // If user does not exist, create a new user
    if (error.code === 'auth/user-not-found') {
      try {
        const db = admin.firestore();
        let referredBy = null;

        // Validate referrer code if one exists
        if (authData.referralCode) {
          const referrerQuery = await db.collection('users').where('referralCode', '==', authData.referralCode).limit(1).get();
          if (!referrerQuery.empty) {
            const referrerDoc = referrerQuery.docs[0];
            referredBy = referrerDoc.id;
          }
        }

        // Create new user in Firebase Auth
        await admin.auth().createUser({
          uid: walletPublicKey,
        });

        // Create new user in Firestore
        await db.collection('users').doc(walletPublicKey).set({
          referredBy,
          referralCode: uuidv4(),
        });
        console.log('successfully created new user')
      } catch (createUserError: any) {
        return res.status(500).json({ error: createUserError.message });
      }
    } else {
      // An unexpected error occurred
      return res.status(500).json({ error: error.message });
    }
  }

  // Log successful login attempt
  await logAttempt(walletPublicKey, authData.uuid, signedData, true);

  // Generate a custom token for the client to sign in
  const customToken = await admin.auth().createCustomToken(walletPublicKey);

  // At this point, either the user already existed, or a new user was created.
  // Respond with success and custom token.
  res.status(200).json({ status: 'success', uid: walletPublicKey, token: customToken });
}
