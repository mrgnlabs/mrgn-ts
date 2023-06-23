import * as admin from 'firebase-admin';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

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
  console.log('authenticating user');
  const { publicKey, signature, uuid } = req.body;

  if (!publicKey || !signature || !uuid) {
    return res.status(400).json({ error: 'publicKey, signature, and uuid are required' });
  }

  try {
    const encodedMessage = new TextEncoder().encode(uuid);
    const decodedPublicKey = new PublicKey(publicKey).toBuffer();
    const decodedSignature = Buffer.from(signature, 'base64');

    const validSignature = nacl.sign.detached.verify(
      encodedMessage,
      decodedSignature,
      decodedPublicKey,
    );

    if (!validSignature) {
      await logAttempt(publicKey, uuid, signature, false);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Try to get the user with the given uid
    await admin.auth().getUser(publicKey);
  } catch (error: any) {
    // If user does not exist, create a new user
    if (error.code === 'auth/user-not-found') {
      try {
        await admin.auth().createUser({
          uid: publicKey,
        });
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

  // At this point, either the user already existed, or a new user was created.
  // Respond with success.
  res.status(200).json({ status: 'success', uid: publicKey });
}
