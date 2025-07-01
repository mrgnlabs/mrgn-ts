import {
  chunkedGetRawMultipleAccountInfoOrdered,
  chunkedGetRawMultipleAccountInfoOrderedWithNulls,
  getAssociatedTokenAddressSync,
  MintLayout,
  nativeToUi,
  unpackAccount,
} from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { NextApiRequest, NextApiResponse } from "next";

interface TokenInfo {
  tokenProgram: string;
  mint: string;
  decimal: number;
}

interface EnhancedTokenInfo {
  tokenProgram: PublicKey;
  mint: PublicKey;
  decimal: number;
  ata: PublicKey;
}

interface BalanceDataRequest {
  address: string;
  tokens: TokenInfo[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as BalanceDataRequest;

    // Validate request body
    if (!body.address || !body.tokens || !Array.isArray(body.tokens)) {
      return res.status(400).json({ error: "Invalid request body. Expected address string and tokens array" });
    }

    // Validate each token object has the required fields
    const validTokens = body.tokens.every(
      (token) =>
        typeof token.tokenProgram === "string" && typeof token.mint === "string" && typeof token.decimal === "number"
    );

    if (!validTokens) {
      return res.status(400).json({
        error: "Invalid tokens array. Each token must have tokenProgram, mint, and decimal as strings",
      });
    }

    if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
      return res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
    }

    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);
    const addressPk = new PublicKey(body.address);

    const tokens: EnhancedTokenInfo[] = body.tokens.map((token) => {
      const mint = new PublicKey(token.mint);
      const tokenProgram = new PublicKey(token.tokenProgram);

      const ata = getAssociatedTokenAddressSync(mint, addressPk, true, tokenProgram);
      return {
        tokenProgram,
        mint,
        decimal: Number(token.decimal),
        ata,
      };
    });

    const ataAddresses = tokens.map((token) => token.ata);
    const totalArray: string[] = [addressPk, ...ataAddresses].map((pk) => pk.toBase58());

    const accountsAiList = await chunkedGetRawMultipleAccountInfoOrderedWithNulls(connection, totalArray);

    // Decode account buffers
    const [walletAi, ...ataAiList] = accountsAiList;
    const nativeSolBalance = walletAi?.lamports ? walletAi.lamports / 1e9 : 0;

    const ataList: {
      created: boolean;
      mint: string;
      balance: number;
    }[] = ataAiList.map((ai, index) => {
      const token = tokens[index];

      if (!ai) {
        return {
          created: false,
          mint: token.mint.toBase58(),
          balance: 0,
        };
      }

      const decoded = unpackAccount(token.ata, ai, token.tokenProgram);
      return {
        created: true,
        mint: token.mint.toBase58(),
        balance: nativeToUi(new BN(decoded.amount.toString()), token.decimal),
      };
    });

    res.status(200).json({
      nativeSolBalance,
      ataList,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error processing request" });
  }
}
