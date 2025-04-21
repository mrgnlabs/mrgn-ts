import dotenv from "dotenv";
import * as admin from "firebase-admin";
import { getDefaultYargsOptions } from "../lib/config";
import { shortenAddress } from "@mrgnlabs/mrgn-common";

dotenv.config();

type ActivityDetails = {
  amount?: string;
  symbol?: string;
  secondaryAmount?: string;
  secondarySymbol?: string;
};

type Activity = {
  id: string;
  type: string;
  details: ActivityDetails;
  account?: string;
  timestamp: admin.firestore.Timestamp;
  txn: string;
};

async function main() {
  const argv = getDefaultYargsOptions()
    .option("wallet", {
      alias: "w",
      type: "string",
      description: "Wallet address to fetch activity for",
      required: true,
    })
    .option("limit", {
      alias: "l",
      type: "number",
      description: "Number of activities to fetch",
      default: 20,
    })
    .parseSync();

  // Initialize Firebase
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

  const db = admin.firestore();

  // Query the user's activities subcollection
  const snapshot = await db
    .collection("activity")
    .doc(argv.wallet)
    .collection("activities")
    .orderBy("timestamp", "desc")
    .limit(argv.limit)
    .get();

  // Get all unique account addresses from activities
  const accountAddresses = new Set<string>();
  const activities = snapshot.docs.map((doc) => {
    const data = doc.data() as Activity;
    if (data.account) {
      accountAddresses.add(data.account);
    }
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate() || null,
    };
  });

  // Fetch account labels for all accounts
  const accountLabelsPromises = Array.from(accountAddresses).map(async (account) => {
    const labelDoc = await db.collection("account_labels").doc(account).get();
    return {
      account,
      label: labelDoc.exists ? labelDoc.data()?.label : null,
    };
  });

  const accountLabels = await Promise.all(accountLabelsPromises);
  const accountLabelsMap = new Map(accountLabels.map(({ account, label }) => [account, label]));

  // Format activities for table output
  const formattedActivities = activities.map((activity) => ({
    Type: activity.type,
    Amount: activity.details?.amount || "",
    Symbol: activity.details?.symbol || "",
    "Secondary Amount": activity.details?.secondaryAmount || "",
    "Secondary Symbol": activity.details?.secondarySymbol || "",
    Account: activity.account ? accountLabelsMap.get(activity.account) || shortenAddress(activity.account) : "",
    Timestamp: activity.timestamp?.toLocaleString() || "",
    Transaction: shortenAddress(activity.txn) || "",
  }));

  console.log(`\nActivity for wallet: ${argv.wallet}`);
  console.table(formattedActivities);
}

main().catch((err) => {
  console.error(err);
});
