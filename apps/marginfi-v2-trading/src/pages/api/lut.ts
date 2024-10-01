import { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";
import { Storage } from "@google-cloud/storage";
import { PublicKey, Connection } from "@solana/web3.js";
import { getConfig, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { NodeWallet } from "@mrgnlabs/mrgn-common";

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || "mrgn-public";
const FILE_NAME = "mrgn-lut-cache.json";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Only POST requests are allowed" });
    return;
  }

  const { groupAddress, lutAddress } = JSON.parse(req.body);

  if (!groupAddress || !lutAddress) {
    res.status(400).json({ message: "groupAddress and lutAddress are required" });
    return;
  }

  // check if groupAddress and lutAddress are valid public keys
  try {
    new PublicKey(groupAddress);
    new PublicKey(lutAddress);
  } catch (error) {
    res.status(400).json({ message: "Invalid public key" });
    return;
  }

  // Ensure groupAddress is a valid Marginfi account
  try {
    const connection = new Connection(
      process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || "",
      "confirmed"
    );
    const wallet = NodeWallet.local();
    const config = await getConfig("production");
    const client = await MarginfiClient.fetch(
      {
        ...config,
        groupPk: new PublicKey(groupAddress),
      },
      wallet,
      connection
    );

    if (!client.banks) {
      res.status(400).json({ message: "Invalid Marginfi group address" });
      return;
    }
  } catch (error) {
    res.status(400).json({ message: "Invalid Marginfi group address" });
    return;
  }

  try {
    // Fetch the existing JSON file from GCP
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(FILE_NAME);
    const [fileContents] = await file.download();
    const lutCache = JSON.parse(fileContents.toString());

    // Append the new entry
    lutCache[groupAddress] = lutAddress;

    // Upload the updated JSON file back to GCP
    const tempFilePath = path.join(process.cwd(), FILE_NAME);
    fs.writeFileSync(tempFilePath, JSON.stringify(lutCache, null, 2));
    await bucket.upload(tempFilePath, {
      destination: FILE_NAME,
      metadata: {
        contentType: "application/json",
      },
    });

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    res.status(200).json({ message: "LUT cache updated successfully" });
  } catch (error) {
    console.error("Error updating LUT cache:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
