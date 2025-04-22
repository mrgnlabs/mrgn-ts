import dotenv from "dotenv";
import * as admin from "firebase-admin";
import { getDefaultYargsOptions } from "../lib/config";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import fs from "fs";
import path from "path";

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
    .option("output", {
      alias: "o",
      type: "string",
      description: "Output file path",
      default: "./activity-export.json",
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
    });
  }

  const db = admin.firestore();

  // List all collections
  const collections = await db.listCollections();
  const activityCollection = collections.find((col) => col.id === "activity");

  if (!activityCollection) {
    console.error("No activity collection found");
    return;
  }

  // Get all wallet documents in the activity collection
  const walletDocs = await activityCollection.listDocuments();
  console.log(`Found ${walletDocs.length} wallets with activity`);

  const allActivities: Record<string, any[]> = {};

  // Fetch activities for each wallet
  for (const walletDoc of walletDocs) {
    const walletAddress = walletDoc.id;
    console.log(`Fetching activities for wallet: ${shortenAddress(walletAddress)}`);

    const activitiesSnapshot = await walletDoc.collection("activities").orderBy("timestamp", "desc").get();

    if (activitiesSnapshot.empty) {
      console.log(`No activities found for wallet: ${shortenAddress(walletAddress)}`);
      continue;
    }

    // Get all unique account addresses from this wallet's activities
    const accountAddresses = new Set<string>();
    const activities = activitiesSnapshot.docs.map((activityDoc) => {
      const data = activityDoc.data() as Activity;
      if (data.account) {
        accountAddresses.add(data.account);
      }
      return {
        id: activityDoc.id,
        ...data,
        timestamp: data.timestamp?.toDate()?.toISOString() || null,
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

    // Format activities
    const formattedActivities = activities.map((activity) => ({
      type: activity.type,
      amount: activity.details?.amount || "",
      symbol: activity.details?.symbol || "",
      secondaryAmount: activity.details?.secondaryAmount || "",
      secondarySymbol: activity.details?.secondarySymbol || "",
      account: activity.account ? accountLabelsMap.get(activity.account) || activity.account : "",
      timestamp: activity.timestamp,
      transaction: activity.txn,
    }));

    allActivities[walletAddress] = formattedActivities;
  }

  // Ensure output directory exists
  const outputDir = path.dirname(argv.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save to file
  fs.writeFileSync(argv.output, JSON.stringify(allActivities, null, 2));
  console.log(`\nExported activities to ${argv.output}`);
  console.log(`Total wallets processed: ${Object.keys(allActivities).length}`);
}

main().catch((err) => {
  console.error(err);
});
