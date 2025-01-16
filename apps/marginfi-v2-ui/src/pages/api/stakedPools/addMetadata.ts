import { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";
import { Storage } from "@google-cloud/storage";
import { PublicKey } from "@solana/web3.js";

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || "mrgn-public";
const STAKED_BANK_METADATA_FILE_NAME = "mrgn-staked-bank-metadata-cache.json";
const STAKED_TOKEN_METADATA_FILE_NAME = "mrgn-staked-token-metadata-cache.json";

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

  const { bankAddress, validatorVoteAccount, tokenAddress, tokenName, tokenSymbol, tokenDecimals } = req.body;

  if (!bankAddress || !validatorVoteAccount || !tokenAddress || !tokenName || !tokenSymbol || !tokenDecimals) {
    res.status(400).json({
      message: "bankAddress, validatorVoteAccount, tokenAddress, tokenName, tokenSymbol, tokenDecimals are required",
    });
    return;
  }

  // check if groupAddress and lutAddress are valid public keys
  try {
    new PublicKey(bankAddress);
    new PublicKey(validatorVoteAccount);
    new PublicKey(tokenAddress);
  } catch (error) {
    res.status(400).json({ message: "Invalid public key" });
    return;
  }

  try {
    await addStakedBankMetadata({
      bankAddress,
      validatorVoteAccount,
      tokenAddress,
      tokenName,
      tokenSymbol,
    });

    await addStakedTokenMetadata({
      symbol: tokenSymbol,
      address: tokenAddress,
      name: tokenName,
      decimals: tokenDecimals,
    });

    res.status(200).json({ message: "Bank and token metadata updated successfully" });
  } catch (error) {
    if (error instanceof MetadataExistsError) {
      res.status(400).json({ message: error.message });
    } else {
      console.error("Error updating bank and token metadata:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

const addStakedBankMetadata = async (updatedData: StakedBankMetadata) => {
  // Fetch the existing JSON file from GCP
  const bucket = storage.bucket(BUCKET_NAME);
  const bankFile = bucket.file(STAKED_BANK_METADATA_FILE_NAME);
  const [fileContents] = await bankFile.download();
  const stakedBankMetadata: StakedBankMetadata[] = JSON.parse(fileContents.toString());

  const isUnique = !stakedBankMetadata.some(
    (metadata) =>
      metadata.bankAddress === updatedData.bankAddress &&
      metadata.validatorVoteAccount === updatedData.validatorVoteAccount &&
      metadata.tokenAddress === updatedData.tokenAddress &&
      metadata.tokenName === updatedData.tokenName &&
      metadata.tokenSymbol === updatedData.tokenSymbol
  );

  if (!isUnique) {
    throw new MetadataExistsError("The updated data already exists in the metadata array.");
  }

  stakedBankMetadata.push(updatedData);

  // Upload the updated JSON file back to GCP
  const tempFilePath = path.join(process.cwd(), STAKED_BANK_METADATA_FILE_NAME);
  fs.writeFileSync(tempFilePath, JSON.stringify(stakedBankMetadata, null, 2));
  await bucket.upload(tempFilePath, {
    destination: STAKED_BANK_METADATA_FILE_NAME,
    metadata: {
      contentType: "application/json",
    },
  });

  // Clean up the temporary file
  fs.unlinkSync(tempFilePath);
};

const addStakedTokenMetadata = async (updatedData: StakedTokenMetadata) => {
  // Fetch the existing JSON file from GCP
  const bucket = storage.bucket(BUCKET_NAME);
  const bankFile = bucket.file(STAKED_TOKEN_METADATA_FILE_NAME);
  const [fileContents] = await bankFile.download();
  const stakedTokenMetadata: StakedTokenMetadata[] = JSON.parse(fileContents.toString());

  const isUnique = !stakedTokenMetadata.some(
    (metadata) =>
      metadata.symbol === updatedData.symbol &&
      metadata.address === updatedData.address &&
      metadata.name === updatedData.name &&
      metadata.decimals === updatedData.decimals
  );

  if (!isUnique) {
    throw new MetadataExistsError("The updated data already exists in the metadata array.");
  }

  stakedTokenMetadata.push(updatedData);

  // Upload the updated JSON file back to GCP
  const tempFilePath = path.join(process.cwd(), STAKED_TOKEN_METADATA_FILE_NAME);
  fs.writeFileSync(tempFilePath, JSON.stringify(stakedTokenMetadata, null, 2));
  await bucket.upload(tempFilePath, {
    destination: STAKED_TOKEN_METADATA_FILE_NAME,
    metadata: {
      contentType: "application/json",
    },
  });

  // Clean up the temporary file
  fs.unlinkSync(tempFilePath);
};

type StakedTokenMetadata = {
  symbol: string;
  address: string;
  name: string;
  decimals: number;
};

type StakedBankMetadata = {
  bankAddress: string;
  validatorVoteAccount: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
};

class MetadataExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetadataExistsError";
  }
}
