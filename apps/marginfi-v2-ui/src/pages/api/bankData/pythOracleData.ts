import { OraclePriceDto } from "@mrgnlabs/marginfi-client-v2";
import { getChainPythOracleData, getStepPythOracleData } from "@mrgnlabs/mrgn-state";
import { Connection } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";

const S_MAXAGE_TIME = 10;
const STALE_WHILE_REVALIDATE_TIME = 15;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestedPythOracleKeysRaw = req.query.pythOracleKeys;

  if (!requestedPythOracleKeysRaw || typeof requestedPythOracleKeysRaw !== "string") {
    return res.status(400).json({ error: "Invalid input: expected an array of bank base58-encoded addresses." });
  }

  if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
    return res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
  }

  const requestedPythOracleKeys = requestedPythOracleKeysRaw.split(",").map((bankAddress) => bankAddress.trim());

  const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);

  try {
    let updatedOraclePriceByKey: Record<string, OraclePriceDto> = {};

    // updatedOraclePriceByKey = await getStepPythOracleData(requestedPythOracleKeys, process.env.STEP_API_KEY);
    updatedOraclePriceByKey = await getChainPythOracleData(requestedPythOracleKeys, connection);

    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);
    return res.status(200).json(updatedOraclePriceByKey);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}
