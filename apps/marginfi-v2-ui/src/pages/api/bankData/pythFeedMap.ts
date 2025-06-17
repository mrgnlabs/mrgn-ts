import { Connection, PublicKey } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";

import {
  findPythPushOracleAddress,
  MARGINFI_SPONSORED_SHARD_ID,
  PYTH_PUSH_ORACLE_ID,
  PYTH_SPONSORED_SHARD_ID,
  PythPushFeedIdMap,
} from "@mrgnlabs/marginfi-client-v2";
import { parsePriceInfo } from "@mrgnlabs/marginfi-client-v2/dist/vendor";

/*
Pyth push oracles have a specific feed id starting with 0x
*/
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const feedIds = req.query.feedIds;
    if (!feedIds || typeof feedIds !== "string") {
      return res.status(400).json({ error: "Invalid input: expected a feedIds string." });
    }

    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");
    const feedIdMap = await buildFeedIdMap(
      feedIds.split(",").map((feedId) => new PublicKey(feedId)),
      connection
    );

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=119");
    return res.status(200).json(stringifyFeedIdMap(feedIdMap));
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}

function stringifyFeedIdMap(feedIdMap: PythPushFeedIdMap) {
  let feedIdMap2: Record<string, { feedId: string; shardId?: number }> = {};

  feedIdMap.forEach((value, key) => {
    feedIdMap2[key] = { feedId: value.feedId.toBase58(), shardId: value.shardId };
  });
  return feedIdMap2;
}

export async function buildFeedIdMap(feedIds: PublicKey[], connection: Connection): Promise<PythPushFeedIdMap> {
  const feedIdMap: PythPushFeedIdMap = new Map<string, { feedId: PublicKey; shardId?: number }>();

  const feedIdsWithAddresses = feedIds
    //   .filter((bankConfig) => parseOracleSetup(bankConfig.oracleSetup) == OracleSetup.PythPushOracle)
    .map((feedId) => {
      let feedIdBuffer = feedId.toBuffer();
      return {
        feedId: feedIdBuffer,
        addresses: [
          findPythPushOracleAddress(feedIdBuffer, PYTH_PUSH_ORACLE_ID, PYTH_SPONSORED_SHARD_ID),
          findPythPushOracleAddress(feedIdBuffer, PYTH_PUSH_ORACLE_ID, MARGINFI_SPONSORED_SHARD_ID),
        ],
      };
    })
    .flat();

  const addressess = feedIdsWithAddresses.map((feedIdWithAddress) => feedIdWithAddress.addresses).flat();
  const accountInfos = [];

  const chunkSize = 25;
  for (let i = 0; i < addressess.length; i += chunkSize) {
    const chunk = addressess.slice(i, i + chunkSize);
    const accountInfosChunk = await connection.getMultipleAccountsInfo(chunk);
    accountInfos.push(...accountInfosChunk);
  }

  for (let i = 0; i < feedIdsWithAddresses.length; i++) {
    const oraclesStartIndex = i * 2;

    const pythSponsoredOracle = accountInfos[oraclesStartIndex];
    const mfiSponsoredOracle = accountInfos[oraclesStartIndex + 1];

    const feedId = feedIdsWithAddresses[i].feedId.toString("hex");

    if (mfiSponsoredOracle && pythSponsoredOracle) {
      let pythPriceAccount = parsePriceInfo(pythSponsoredOracle.data.slice(8));
      let pythPublishTime = pythPriceAccount.priceMessage.publishTime;

      let mfiPriceAccount = parsePriceInfo(mfiSponsoredOracle.data.slice(8));
      let mfiPublishTime = mfiPriceAccount.priceMessage.publishTime;

      if (pythPublishTime > mfiPublishTime) {
        feedIdMap.set(feedId, { feedId: feedIdsWithAddresses[i].addresses[0], shardId: PYTH_SPONSORED_SHARD_ID });
      } else {
        feedIdMap.set(feedId, { feedId: feedIdsWithAddresses[i].addresses[1], shardId: MARGINFI_SPONSORED_SHARD_ID });
      }
    } else if (pythSponsoredOracle) {
      feedIdMap.set(feedId, { feedId: feedIdsWithAddresses[i].addresses[0], shardId: PYTH_SPONSORED_SHARD_ID });
    } else if (mfiSponsoredOracle) {
      feedIdMap.set(feedId, { feedId: feedIdsWithAddresses[i].addresses[1], shardId: MARGINFI_SPONSORED_SHARD_ID });
    } else {
      throw new Error(`No oracle found for feedId: ${feedId}, either Pyth or MFI sponsored oracle must exist`);
    }
  }

  return feedIdMap;
}
