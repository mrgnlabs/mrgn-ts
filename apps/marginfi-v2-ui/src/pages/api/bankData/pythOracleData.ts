import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  MARGINFI_IDL,
  MarginfiIdlType,
  MarginfiProgram,
  OraclePriceDto,
  PYTH_PRICE_CONF_INTERVALS,
} from "@mrgnlabs/marginfi-client-v2";

import { Wallet } from "@mrgnlabs/mrgn-common";
import { Connection } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { NextApiRequest, NextApiResponse } from "next";
import config from "~/config/marginfi";

const S_MAXAGE_TIME = 10;
const STALE_WHILE_REVALIDATE_TIME = 15;
const STEP_API_KEY = "sol-6dd2cad8-edc5-4889-b782-64bafa7cad03";

interface PythOracleData {
  last_updated_ts: string;
  value: string;
  confidence: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestedPythOracleKeysRaw = req.query.pythOracleKeys;

  if (!requestedPythOracleKeysRaw || typeof requestedPythOracleKeysRaw !== "string") {
    return res.status(400).json({ error: "Invalid input: expected an array of bank base58-encoded addresses." });
  }

  const requestedPythOracleKeys = requestedPythOracleKeysRaw.split(",").map((bankAddress) => bankAddress.trim());

  const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");
  const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;
  const provider = new AnchorProvider(connection, {} as Wallet, {
    ...AnchorProvider.defaultOptions(),
    commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
  });
  const program = new Program(idl, provider) as any as MarginfiProgram;

  let updatedOraclePriceByKey: Record<string, OraclePriceDto> = {};

  try {
    const response = await fetch(`https://api.step.finance/oracle/current?apiKey=${STEP_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: requestedPythOracleKeys,
      }),
    });

    const pythOracleData: Record<string, PythOracleData> = await response.json();

    for (const index in pythOracleData) {
      const oracleData = pythOracleData[index];
      let oraclePrice = parsePythPriceData(oracleData);

      if (oraclePrice.priceRealtime.price === "0") {
        oraclePrice = {
          ...oraclePrice,
          priceRealtime: {
            price: "0",
            confidence: "0",
            lowestPrice: "0",
            highestPrice: "0",
          },
          priceWeighted: {
            price: "0",
            confidence: "0",
            lowestPrice: "0",
            highestPrice: "0",
          },
        };
      }

      updatedOraclePriceByKey[index] = oraclePrice;
    }

    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);
    return res.status(200).json(updatedOraclePriceByKey);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}

function parsePythPriceData(data: PythOracleData): OraclePriceDto {
  function capConfidenceInterval(price: BigNumber, confidence: BigNumber, maxConfidence: BigNumber): BigNumber {
    let maxConfidenceInterval = price.times(maxConfidence);

    return BigNumber.min(confidence, maxConfidenceInterval);
  }

  const price = data.value;
  const bigNumberPrice = new BigNumber(price);
  const confidence = data.confidence;
  const bigNumberConfidence = new BigNumber(confidence);
  const timestamp = data.last_updated_ts;

  const confidenceCapped = capConfidenceInterval(bigNumberPrice, bigNumberConfidence, PYTH_PRICE_CONF_INTERVALS);

  const lowestPrice = bigNumberPrice.minus(confidenceCapped);
  const highestPrice = bigNumberPrice.plus(confidenceCapped);

  return {
    priceRealtime: {
      price: bigNumberPrice.toString(),
      confidence: confidenceCapped.toString(),
      lowestPrice: lowestPrice.toString(),
      highestPrice: highestPrice.toString(),
    },
    priceWeighted: {
      price: bigNumberPrice.toString(),
      confidence: confidenceCapped.toString(),
      lowestPrice: lowestPrice.toString(),
      highestPrice: highestPrice.toString(),
    },
    timestamp: new BigNumber(Number(timestamp)).toString(),
  };
}
