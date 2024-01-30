import * as admin from "firebase-admin";
import { Resend } from "resend";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return Response.json({ error: "Wallet address required" }, { status: 404 });
  }

  const db = admin.firestore();
  const user = await db.collection("notification_settings").doc(wallet).get();

  if (!user.exists) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const userData = user.data();

  if (!userData) {
    return Response.json({ error: "User data not found" }, { status: 404 });
  }

  if (!userData.account_health) {
    return Response.json({ error: "User has account health notifications turned off" }, { status: 404 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "engineering@mrgn.group",
    subject: "Hello World",
    html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
