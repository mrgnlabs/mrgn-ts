import { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";
import { Storage } from "@google-cloud/storage";
import { PublicKey, Connection } from "@solana/web3.js";
import { getConfig, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { NodeWallet } from "@mrgnlabs/mrgn-common";

type CreatePoolData = {
  groupAddress: string;
  lutAddress: string;
  usdcBankAddress: string;
  tokenBankAddress: string;
  tokenName: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenImage: string;
  tokenDecimals: number;
};

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || "mrgn-public";
const LUT_FILE_NAME = "mrgn-lut-cache-test.json";
const GROUPS_FILE_NAME = "mfi-trade-groups-test.json";
const BANK_FILE_NAME = "mfi-trade-bank-metadata-cache-test.json";
const TOKEN_FILE_NAME = "mfi-trade-token-metadata-cache-test.json";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

const validateCreatePoolData = (data: Partial<CreatePoolData>): { valid: boolean; missingFields: string[] } => {
  const requiredFields: (keyof CreatePoolData)[] = [
    "groupAddress",
    "lutAddress",
    "usdcBankAddress",
    "tokenBankAddress",
    "tokenName",
    "tokenMint",
    "tokenSymbol",
    "tokenImage",
    "tokenDecimals",
  ];

  const missingFields = requiredFields.filter((field) => !data[field]);
  return { valid: missingFields.length === 0, missingFields };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Only POST requests are allowed" });
    return;
  }

  // check all fields are present
  const createPoolDataTmp: Partial<CreatePoolData> = {
    groupAddress: req.body.groupAddress,
    lutAddress: req.body.lutAddress,
    usdcBankAddress: req.body.usdcBankAddress,
    tokenBankAddress: req.body.tokenBankAddress,
    tokenName: req.body.tokenName,
    tokenMint: req.body.tokenMint,
    tokenSymbol: req.body.tokenSymbol,
    tokenImage: req.body.tokenImage,
    tokenDecimals: req.body.tokenDecimals,
  };

  const { valid, missingFields } = validateCreatePoolData(createPoolDataTmp);
  if (!valid) {
    return res.status(400).json({ message: `Missing required fields: ${missingFields.join(", ")}` });
  }

  // createPoolData is guaranteed to have all fields
  const createPoolData = createPoolDataTmp as CreatePoolData;

  // check valid public keys
  let usdcBankPk: PublicKey | null = null;
  let tokenBankPk: PublicKey | null = null;
  let groupPk: PublicKey | null = null;
  let lutPk: PublicKey | null = null;

  try {
    usdcBankPk = new PublicKey(createPoolData.usdcBankAddress);
    tokenBankPk = new PublicKey(createPoolData.tokenBankAddress);
    groupPk = new PublicKey(createPoolData.groupAddress);
    lutPk = new PublicKey(createPoolData.lutAddress);
  } catch (error) {
    res.status(400).json({ message: "Invalid public keys" });
    return;
  }

  // check groupAddress is a valid Marginfi account
  // and that the usdcBankAddress and tokenBankAddress are valid banks in the group
  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE!, "confirmed");
    const wallet = NodeWallet.local();
    const config = await getConfig("production");
    const client = await MarginfiClient.fetch(
      {
        ...config,
        groupPk,
      },
      wallet,
      connection
    );

    const usdcBank = client.getBankByPk(usdcBankPk);
    const tokenBank = client.getBankByPk(tokenBankPk);

    if (!client.banks) {
      res.status(400).json({ message: "Invalid Marginfi group address" });
      return;
    }

    if (!usdcBank || !tokenBank) {
      res.status(400).json({ message: "Invalid Marginfi bank addresses" });
      return;
    }
  } catch (error) {
    res.status(400).json({ message: "Invalid Marginfi group / bank addresses" });
    return;
  }

  try {
    // get the cache files
    const bucket = storage.bucket(BUCKET_NAME);

    const lutCacheFile = bucket.file(LUT_FILE_NAME);
    const [lutCacheFileContents] = await lutCacheFile.download();
    const lutCache = JSON.parse(lutCacheFileContents.toString());

    const groupsCacheFile = bucket.file(GROUPS_FILE_NAME);
    const [groupsCacheFileContents] = await groupsCacheFile.download();
    const groupsCache = JSON.parse(groupsCacheFileContents.toString());

    const bankMetadataCacheFile = bucket.file(BANK_FILE_NAME);
    const [bankMetadataCacheFileContents] = await bankMetadataCacheFile.download();
    const bankMetadataCache = JSON.parse(bankMetadataCacheFileContents.toString());

    const tokenMetadataCacheFile = bucket.file(TOKEN_FILE_NAME);
    const [tokenMetadataCacheFileContents] = await tokenMetadataCacheFile.download();
    const tokenMetadataCache = JSON.parse(tokenMetadataCacheFileContents.toString());

    // append the new entries
    lutCache[createPoolData.groupAddress] = createPoolData.lutAddress;
    groupsCache[createPoolData.groupAddress] = [createPoolData.usdcBankAddress, createPoolData.tokenBankAddress];
    bankMetadataCache.push({
      groupAddress: createPoolData.groupAddress,
      bankAddress: createPoolData.tokenBankAddress,
      tokenAddress: createPoolData.tokenMint,
      tokenName: createPoolData.tokenName,
      tokenSymbol: createPoolData.tokenSymbol,
    });
    bankMetadataCache.push({
      groupAddress: createPoolData.groupAddress,
      bankAddress: createPoolData.usdcBankAddress,
      tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      tokenName: "USD Coin",
      tokenSymbol: "USDC",
    });
    tokenMetadataCache.push({
      symbol: createPoolData.tokenSymbol,
      address: createPoolData.tokenMint,
      chainId: 101,
      decimals: createPoolData.tokenDecimals,
      name: createPoolData.tokenName,
      logoURI: "",
      extensions: {
        coingeckoId: "",
      },
    });

    // upload the updated JSON files back to GCP
    const filesToUpload = [
      { name: LUT_FILE_NAME, data: lutCache },
      { name: GROUPS_FILE_NAME, data: groupsCache },
      { name: BANK_FILE_NAME, data: bankMetadataCache },
      { name: TOKEN_FILE_NAME, data: tokenMetadataCache },
    ];

    for (const file of filesToUpload) {
      const fileContent = JSON.stringify(file.data, null, 2);
      await bucket.file(file.name).save(fileContent, {
        contentType: "application/json",
      });
    }

    res.status(200).json({ message: "Cache files updated successfully" });
  } catch (error) {
    console.error("Error updating cache files:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
