import * as admin from 'firebase-admin';
import { Transaction } from '@solana/web3.js';
import { v4 as uuidv4 } from "uuid";

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

export default async function handler(req: any, res: any) {
  const { publicKey, signature, uuid, referralCode } = req.body;

  if (!publicKey || !signature || !uuid) {
    return res.status(400).json({ error: 'publicKey, signature, and uuid are required' });
  }

  try {
    const tx = Transaction.from(Buffer.from(signature, "base64"));

    const isValidSignature =
      tx.instructions.length === 1 &&
      tx.instructions[0] !== undefined &&
      tx.feePayer?.toBase58() === publicKey &&
      tx.verifySignatures();

    if (!isValidSignature) {
      await logAttempt(publicKey, uuid, signature, false);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Try to get the user with the given uid
    await admin.auth().getUser(publicKey);
  } catch (error: any) {
    // If user does not exist, create a new user
    if (error.code === 'auth/user-not-found') {
      try {
        const db = admin.firestore();
        let referredBy = null;

        // Validate referrer code if one exists
        if (referralCode) {
          const referrerQuery = await db.collection('users').where('referralCode', '==', referralCode).limit(1).get();
          if (!referrerQuery.empty) {
            const referrerDoc = referrerQuery.docs[0];
            referredBy = referrerDoc.id;
          }
        }

        // Create new user in Firebase Auth
        await admin.auth().createUser({
          uid: publicKey,
        });

        // Create new user in Firestore
        await db.collection('users').doc(publicKey).set({
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
  await logAttempt(publicKey, uuid, signature, true);

  // Generate a custom token for the client to sign in
  const customToken = await admin.auth().createCustomToken(publicKey);

  // At this point, either the user already existed, or a new user was created.
  // Respond with success and custom token.
  res.status(200).json({ status: 'success', uid: publicKey, token: customToken });
}
