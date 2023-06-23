import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from 'firebase-admin';

// Check if the app is already initialized to avoid initializing multiple times
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('authenticating user');
  const { publicKey } = req.body;

  if (!publicKey) {
    return res.status(400).json({ error: 'publicKey is required' });
  }

  try {
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

  // At this point, either the user already existed, or a new user was created.
  // Respond with success.
  res.status(200).json({ status: 'success', uid: publicKey });
}
