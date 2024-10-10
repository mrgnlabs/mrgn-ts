import { NextApiRequest, NextApiResponse } from "next";
import { Storage, Bucket } from "@google-cloud/storage";
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

const uploadImageToGCP = async (imageUrl: string, tokenMint: string): Promise<string> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to fetch image");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `mrgn-trade-token-icons-test/${tokenMint}.png`;
    const file = storage.bucket(BUCKET_NAME).file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: "image/png",
      },
    });

    return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
  } catch (error) {
    console.error("Error uploading image to GCP:", error);
    throw new Error("Failed to upload image to GCP");
  }
};

const getFileContents = async (bucket: Bucket, fileName: string) => {
  const [fileContents] = await bucket.file(fileName).download();
  return JSON.parse(fileContents.toString());
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

    const lutCache = await getFileContents(bucket, LUT_FILE_NAME);
    const groupsCache = await getFileContents(bucket, GROUPS_FILE_NAME);
    const bankMetadataCache = await getFileContents(bucket, BANK_FILE_NAME);
    const tokenMetadataCache = await getFileContents(bucket, TOKEN_FILE_NAME);

    // check if group / banks already cached
    const existingEntry = bankMetadataCache.find(
      (entry: any) =>
        entry.groupAddress === createPoolData.groupAddress ||
        entry.bankAddress === createPoolData.usdcBankAddress ||
        entry.bankAddress === createPoolData.tokenBankAddress
    );

    if (existingEntry) {
      return res.status(400).json({ message: "Group, USDC bank, or token bank already exists" });
    }

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
      try {
        const fileContent = JSON.stringify(file.data, null, 2);
        await bucket.file(file.name).save(fileContent, {
          contentType: "application/json",
        });
        console.log(`Successfully uploaded ${file.name}`);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        return res.status(500).json({ message: `Failed to upload ${file.name}` });
      }
    }

    // upload the token image to GCP
    try {
      const gcpImageUrl = await uploadImageToGCP(createPoolData.tokenImage, createPoolData.tokenMint);
      console.log(`Successfully uploaded image ${gcpImageUrl}`);
    } catch (imageUploadError) {
      console.error("Error uploading image:", imageUploadError);
      res.status(500).json({ message: "Error uploading image" });
      return;
    }

    res.status(200).json({ message: "Cache files updated and image uploaded successfully" });
    return;
  } catch (error) {
    console.error("Error updating cache files:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
