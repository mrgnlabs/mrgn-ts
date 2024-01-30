import * as admin from "firebase-admin";

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
    return Response.json({ error: "Wallet not found" }, { status: 404 });
  }

  const db = admin.firestore();
  const user = await db.collection("notification_settings").doc(wallet).get();

  if (!user.exists) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const userData = user.data();

  return Response.json({ ...userData });
}
