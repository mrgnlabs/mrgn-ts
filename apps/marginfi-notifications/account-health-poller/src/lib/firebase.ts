import * as admin from "firebase-admin";
import { env_config } from "../config";

type UserData = {
  email: string;
  wallet_address: string;
  account_health: boolean;
  ybx_updates: boolean;
  updated_at: admin.firestore.Timestamp;
  last_notification?: admin.firestore.Timestamp;
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env_config.FIREBASE_PROJECT_ID,
      clientEmail: env_config.FIREBASE_CLIENT_EMAIL,
      privateKey: env_config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

export async function getUserSettings(wallet: string): Promise<UserData | null> {
  const db = admin.firestore();
  const userDocRef = db.collection("notification_settings").doc(wallet);
  const user = await userDocRef.get();

  if (!user.exists) {
    return null;
  }

  return user.data() as UserData;
}
