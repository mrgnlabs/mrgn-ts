import * as admin from "firebase-admin";
import { Resend } from "resend";

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
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  const healthParam = searchParams.get("health");

  if (!wallet || !healthParam) {
    return new Response(JSON.stringify({ error: "Wallet address and account health required" }), { status: 400 });
  }

  const health = parseInt(healthParam);

  if (isNaN(health) || health > 25) {
    return new Response(JSON.stringify({ error: "Notification not required" }), { status: 400 });
  }

  const db = admin.firestore();
  const userDocRef = db.collection("notification_settings").doc(wallet);
  const user = await userDocRef.get();

  if (!user.exists) {
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
  }

  const userData = user.data() as UserData;

  if (!userData) {
    return new Response(JSON.stringify({ error: "User data not found" }), { status: 404 });
  }

  if (!userData.account_health) {
    return new Response(JSON.stringify({ error: "User has account health notifications turned off" }), { status: 200 });
  }

  const notificationInterval = 60 * 1000; // For testing, set to 1 minute. For production, set to 24 hours.

  const now = new Date().getTime();
  const lastNotificationTime =
    userData.last_notification instanceof admin.firestore.Timestamp ? userData.last_notification.toDate().getTime() : 0;
  if (now - lastNotificationTime < notificationInterval) {
    return new Response(JSON.stringify({ error: "Notification already sent within the interval" }), { status: 429 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "engineering@mrgn.group",
    subject: "Account Health Notification",
    html: `
      <p>Your account health is at ${health}%, if it reaches 0 you are at risk of liquidation.</p>
      <p><a href="https://app.marginfi.com">Login to marginfi</a>
    `,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  await userDocRef.update({
    last_notification: admin.firestore.FieldValue.serverTimestamp(),
  });

  return new Response(JSON.stringify({ data }));
}
