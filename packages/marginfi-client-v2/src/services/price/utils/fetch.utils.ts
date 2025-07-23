import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import { BankMetadata } from "@mrgnlabs/mrgn-common";

import { BankRaw } from "~/services/bank";
import { PythPushFeedIdMap, buildFeedIdMap } from "~/utils";

import { OraclePrice, PriceWithConfidence } from "../types";

/**
 * =============================================================================
 * PYTH ORACLE UTILS
 * =============================================================================
 *
 * Utility functions for fetching Pyth oracle data
 */

type PythFeedMapResponse = Record<
  string,
  {
    feedId: string;
    shardId?: number;
  }
>;

/**
 * Categorizes banks by their oracle setup type
 */
const categorizePythBanks = (banks: { address: PublicKey; data: BankRaw }[]) => {
  const pythMigratedBanks = banks.filter(
    (bank) =>
      (bank.data.config.oracleSetup && "pythLegacy" in bank.data.config.oracleSetup) ||
      (bank.data.config.oracleSetup &&
        "pythPushOracle" in bank.data.config.oracleSetup &&
        bank.data.config.configFlags === 1)
  );
  const pythPushBanks = banks.filter(
    (bank) =>
      bank.data.config.oracleSetup &&
      "pythPushOracle" in bank.data.config.oracleSetup &&
      bank.data.config.configFlags !== 1
  );
  const pythStakedCollateralBanks = banks.filter(
    (bank) => bank.data.config.oracleSetup && "stakedWithPythPush" in bank.data.config.oracleSetup
  );

  return { pythMigratedBanks, pythPushBanks, pythStakedCollateralBanks };
};

/**
 * Fetches Pyth feed map and staked collateral data via API endpoints
 */
const fetchPythDataViaAPI = async (
  pythPushBanks: { address: PublicKey; data: BankRaw }[],
  voteAccMintTuples: [string, string][]
): Promise<{
  pythFeedMap: PythPushFeedIdMap;
  priceCoeffByBank: Record<string, number>;
}> => {
  const pythFeedMapPromise = fetch(
    "/api/bankData/pythFeedMap?feedIds=" +
      pythPushBanks.map((bank) => bank.data.config.oracleKeys[0].toBase58()).join(",")
  );
  const encodedQuery = encodeURIComponent(JSON.stringify(voteAccMintTuples));
  const stakedCollatDataPromise = fetch(`/api/stakeData/stakedCollatData?voteAccMintTuple=${encodedQuery}`);

  const [pythFeedMapResponse, stakedCollatDataResponse] = await Promise.all([
    pythFeedMapPromise,
    stakedCollatDataPromise,
  ]);

  if (!pythFeedMapResponse.ok) {
    throw new Error("Failed to fetch pyth feed map");
  }
  if (!stakedCollatDataResponse.ok) {
    throw new Error("Failed to fetch staked collateral data");
  }

  const pythFeedMapJson: PythFeedMapResponse = await pythFeedMapResponse.json();
  const stakedCollatDataJson: Record<string, number> = await stakedCollatDataResponse.json();

  // Build pythFeedMap
  const pythFeedMap = new Map<string, { feedId: PublicKey; shardId?: number }>();
  Object.entries(pythFeedMapJson).forEach(([feedId, { feedId: feedIdStr, shardId }]) => {
    pythFeedMap.set(feedId, { feedId: new PublicKey(feedIdStr), shardId });
  });

  return { pythFeedMap, priceCoeffByBank: stakedCollatDataJson };
};

/**
 * Fetches Pyth feed map via direct connection (non-API)
 */
const fetchPythDataDirect = async (
  banks: { address: PublicKey; data: BankRaw }[],
  connection: Connection
): Promise<{ pythFeedMap: PythPushFeedIdMap; priceCoeffByBank: Record<string, number> }> => {
  const pythFeedMap = await buildFeedIdMap(
    banks.map((bank) => bank.data.config),
    connection
  );
  const priceCoeffByBank = {};

  return { pythFeedMap, priceCoeffByBank };
};

/**
 * Converts vote account coefficients to bank address coefficients
 */
const convertVoteAccCoeffsToBankCoeffs = (
  pythStakedCollateralBanks: { address: PublicKey; data: BankRaw }[],
  bankMetadataMap: { [address: string]: BankMetadata },
  voteAccCoeffs: Record<string, number>
): Record<string, number> => {
  const priceCoeffByBank: Record<string, number> = {};

  pythStakedCollateralBanks.forEach((bank) => {
    const voteAccount = bankMetadataMap[bank.address.toBase58()]?.validatorVoteAccount;
    if (voteAccount && voteAccCoeffs[voteAccount] !== undefined) {
      priceCoeffByBank[bank.address.toBase58()] = voteAccCoeffs[voteAccount];
    }
  });

  return priceCoeffByBank;
};

/**
 * Extracts oracle keys for Pyth price fetching
 */
const extractPythOracleKeys = (
  pythLegacyBanks: { address: PublicKey; data: BankRaw }[],
  pythPushBanks: { address: PublicKey; data: BankRaw }[],
  pythFeedMap: PythPushFeedIdMap
): string[] => {
  const legacyKeys = pythLegacyBanks.map((bank) => bank.data.config.oracleKeys[0].toBase58());

  const pushKeys = pythPushBanks.map((bank) => {
    const feed = pythFeedMap.get(bank.data.config.oracleKeys[0].toBuffer().toString("hex"));
    if (!feed) {
      throw new Error("Feed not found");
    }
    return feed.feedId.toBase58();
  });

  return [...legacyKeys, ...pushKeys];
};

/**
 * Fetches oracle prices via API endpoint
 */
const fetchPythOraclePricesViaAPI = async (pythOracleKeys: string[]): Promise<Record<string, OraclePrice>> => {
  const response = await fetch("/api/bankData/pythOracleData?pythOracleKeys=" + pythOracleKeys.join(","));

  if (!response.ok) {
    throw new Error("Failed to fetch pyth oracle data");
  }

  const responseBody: Record<string, any> = await response.json();
  return Object.fromEntries(
    Object.entries(responseBody).map(([key, oraclePrice]) => [
      key,
      {
        priceRealtime: {
          price: BigNumber(oraclePrice.priceRealtime.price),
          confidence: BigNumber(oraclePrice.priceRealtime.confidence),
          lowestPrice: BigNumber(oraclePrice.priceRealtime.lowestPrice),
          highestPrice: BigNumber(oraclePrice.priceRealtime.highestPrice),
        },
        priceWeighted: {
          price: BigNumber(oraclePrice.priceWeighted.price),
          confidence: BigNumber(oraclePrice.priceWeighted.confidence),
          lowestPrice: BigNumber(oraclePrice.priceWeighted.lowestPrice),
          highestPrice: BigNumber(oraclePrice.priceWeighted.highestPrice),
        },
        timestamp: oraclePrice.timestamp ? BigNumber(oraclePrice.timestamp) : null,
        pythShardId: oraclePrice.pythShardId,
      },
    ])
  ) as Record<string, OraclePrice>;
};

/**
 * Maps banks to their corresponding oracle prices
 */
const mapPythBanksToOraclePrices = (
  pythMigratedBanks: { address: PublicKey; data: BankRaw }[],
  pythPushBanks: { address: PublicKey; data: BankRaw }[],
  pythStakedCollateralBanks: { address: PublicKey; data: BankRaw }[],
  pythFeedMap: PythPushFeedIdMap,
  oraclePrices: Record<string, OraclePrice>,
  priceCoeffByBank: Record<string, number>
): Map<string, OraclePrice> => {
  const bankOraclePriceMap = new Map<string, OraclePrice>();

  // Map legacy banks
  pythMigratedBanks.forEach((bank) => {
    const oracleKey = bank.data.config.oracleKeys[0].toBase58();
    const oraclePrice = oraclePrices[oracleKey];
    if (oraclePrice) {
      bankOraclePriceMap.set(bank.address.toBase58(), oraclePrice);
    }
  });

  // Map push oracle banks
  pythPushBanks.forEach((bank) => {
    const feed = pythFeedMap.get(bank.data.config.oracleKeys[0].toBuffer().toString("hex"));
    if (feed) {
      const oraclePrice = oraclePrices[feed.feedId.toBase58()];
      if (oraclePrice) {
        bankOraclePriceMap.set(bank.address.toBase58(), oraclePrice);
      }
    }
  });

  // Map staked collateral banks with price coefficient adjustment
  pythStakedCollateralBanks.forEach((bank) => {
    const priceCoeff = priceCoeffByBank[bank.address.toBase58()];
    const feed = pythFeedMap.get(bank.data.config.oracleKeys[0].toBuffer().toString("hex"));

    if (feed && priceCoeff !== undefined) {
      const oraclePrice = oraclePrices[feed?.feedId.toBase58()];
      if (oraclePrice) {
        bankOraclePriceMap.set(bank.address.toBase58(), {
          timestamp: oraclePrice.timestamp,
          priceRealtime: adjustPriceComponent(oraclePrice.priceRealtime, priceCoeff),
          priceWeighted: adjustPriceComponent(oraclePrice.priceWeighted, priceCoeff),
        });
      }
    }
  });

  return bankOraclePriceMap;
};

export const fetchPythOracleData = async (
  banks: { address: PublicKey; data: BankRaw }[],
  bankMetadataMap: {
    [address: string]: BankMetadata;
  },
  connection?: Connection,
  opts?: { useApiEndpoint?: boolean }
): Promise<{
  pythFeedMap: PythPushFeedIdMap;
  bankOraclePriceMap: Map<string, OraclePrice>;
}> => {
  // Step 1: Categorize banks by oracle type
  const { pythMigratedBanks, pythPushBanks, pythStakedCollateralBanks } = categorizePythBanks(banks);

  // Step 2: Prepare vote account mint tuples for staked collateral
  const voteAccMintTuples: [string, string][] = pythStakedCollateralBanks.map((bank) => [
    bankMetadataMap[bank.address.toBase58()]?.validatorVoteAccount ?? "",
    bank.data.mint?.toBase58() ?? "",
  ]);

  // Step 3: Fetch Pyth feed map and price coefficients
  let pythFeedMap: PythPushFeedIdMap;
  let priceCoeffByBank: Record<string, number>;

  if (opts?.useApiEndpoint || !connection) {
    const { pythFeedMap: feedMap, priceCoeffByBank: voteAccCoeffs } = await fetchPythDataViaAPI(
      pythPushBanks,
      voteAccMintTuples
    );
    pythFeedMap = feedMap;
    priceCoeffByBank = convertVoteAccCoeffsToBankCoeffs(pythStakedCollateralBanks, bankMetadataMap, voteAccCoeffs);
  } else {
    const result = await fetchPythDataDirect(banks, connection);
    pythFeedMap = result.pythFeedMap;
    priceCoeffByBank = result.priceCoeffByBank;
  }

  // Step 4: Extract oracle keys for price fetching
  const pythOracleKeys = extractPythOracleKeys(pythMigratedBanks, pythPushBanks, pythFeedMap);

  // Step 5: Fetch oracle prices
  let oraclePrices: Record<string, OraclePrice>;
  if (opts?.useApiEndpoint) {
    oraclePrices = await fetchPythOraclePricesViaAPI(pythOracleKeys);
  } else {
    // Handle non-API endpoint case - placeholder for now
    oraclePrices = {};
  }

  // Step 6: Map banks to oracle prices
  const bankOraclePriceMap = mapPythBanksToOraclePrices(
    pythMigratedBanks,
    pythPushBanks,
    pythStakedCollateralBanks,
    pythFeedMap,
    oraclePrices,
    priceCoeffByBank
  );

  return {
    pythFeedMap,
    bankOraclePriceMap,
  };
};

const adjustPriceComponent = (priceComponent: PriceWithConfidence, priceCoeff: number) => ({
  price: priceComponent.price.multipliedBy(priceCoeff),
  confidence: priceComponent.confidence,
  lowestPrice: priceComponent.lowestPrice.multipliedBy(priceCoeff),
  highestPrice: priceComponent.highestPrice.multipliedBy(priceCoeff),
});

/**
 * =============================================================================
 * SWITCHBOARD ORACLE UTILS
 * =============================================================================
 *
 * Utility functions for fetching Switchboard oracle data
 */

export const fetchSwbOracleData = async (
  banks: { address: PublicKey; data: BankRaw }[],
  opts?: { useApiEndpoint?: boolean }
): Promise<{
  bankOraclePriceMap: Map<string, OraclePrice>;
}> => {
  // Step 1: Fetch Switchboard oracle map
  const switchboardBanks = banks.filter(
    (bank) =>
      bank.data.config.oracleSetup &&
      ("switchboardPull" in bank.data.config.oracleSetup || "switchboardV2" in bank.data.config.oracleSetup)
  );

  let oracleKeyMap: Record<string, { feedId: string }>;

  if (opts?.useApiEndpoint) {
    const { oracleKeyMap: swbOracleKeyMap } = await fetchSwbDataViaAPI(switchboardBanks);
    oracleKeyMap = swbOracleKeyMap;
  } else {
    oracleKeyMap = {};
  }

  // Step 4: Extract oracle keys for price fetching
  const swbFeedIds = Object.values(oracleKeyMap).map((oracleKey) => oracleKey.feedId);

  // Step 5: Fetch oracle prices
  let oraclePrices: Record<string, OraclePrice>;
  if (opts?.useApiEndpoint) {
    oraclePrices = await fetchSwbOraclePricesViaAPI(swbFeedIds);
  } else {
    // Handle non-API endpoint case - placeholder for now
    oraclePrices = {};
  }

  // Step 6: Map switchboardBanks to oracle prices
  const bankOraclePriceMap = mapSwbBanksToOraclePrices(switchboardBanks, oraclePrices, oracleKeyMap);

  return {
    bankOraclePriceMap,
  };
};

/**
 * Fetches Pyth feed map and staked collateral data via API endpoints
 */
const fetchSwbDataViaAPI = async (
  swbPullBanks: { address: PublicKey; data: BankRaw }[]
): Promise<{ oracleKeyMap: Record<string, { feedId: string }> }> => {
  const swbOracleKeyMapResponse = await fetch(
    "/api/bankData/swbOracleMap?oracleKeys=" +
      swbPullBanks.map((bank) => bank.data.config.oracleKeys[0].toBase58()).join(",")
  );

  if (!swbOracleKeyMapResponse.ok) {
    throw new Error("Failed to fetch swb oracle key map");
  }

  const swbOracleKeyMapJson: Record<string, { feedId: string }> = await swbOracleKeyMapResponse.json();

  return { oracleKeyMap: swbOracleKeyMapJson };
};

const fetchSwbOraclePricesViaAPI = async (swbFeedIds: string[]): Promise<Record<string, OraclePrice>> => {
  const response = await fetch("/api/bankData/swbOracleData?feedIds=" + swbFeedIds.join(","));

  if (!response.ok) {
    throw new Error("Failed to fetch swb oracle data");
  }

  const responseBody: Record<string, any> = await response.json();
  return Object.fromEntries(
    Object.entries(responseBody).map(([key, oraclePrice]) => [
      key,
      {
        priceRealtime: {
          price: BigNumber(oraclePrice.priceRealtime.price),
          confidence: BigNumber(oraclePrice.priceRealtime.confidence),
          lowestPrice: BigNumber(oraclePrice.priceRealtime.lowestPrice),
          highestPrice: BigNumber(oraclePrice.priceRealtime.highestPrice),
        },
        priceWeighted: {
          price: BigNumber(oraclePrice.priceWeighted.price),
          confidence: BigNumber(oraclePrice.priceWeighted.confidence),
          lowestPrice: BigNumber(oraclePrice.priceWeighted.lowestPrice),
          highestPrice: BigNumber(oraclePrice.priceWeighted.highestPrice),
        },
        timestamp: oraclePrice.timestamp ? BigNumber(oraclePrice.timestamp) : null,
      },
    ])
  ) as Record<string, OraclePrice>;
};

/**
 * Maps banks to their corresponding oracle prices
 */
const mapSwbBanksToOraclePrices = (
  banks: { address: PublicKey; data: BankRaw }[],
  oraclePrices: Record<string, OraclePrice>,
  oracleKeyMap: Record<string, { feedId: string }>
): Map<string, OraclePrice> => {
  const bankOraclePriceMap = new Map<string, OraclePrice>();

  // Map legacy banks
  banks.forEach((bank) => {
    const oracleKey = bank.data.config.oracleKeys[0].toBase58();
    const oracleFeed = oracleKeyMap[oracleKey];
    const oraclePrice = oracleFeed?.feedId ? oraclePrices[oracleFeed.feedId] : null;
    if (oraclePrice) {
      bankOraclePriceMap.set(bank.address.toBase58(), oraclePrice);
    }
  });

  return bankOraclePriceMap;
};

/**
 * =============================================================================
 * ORACLE UTILS
 * =============================================================================
 *
 * Utility functions for fetching all oracle data
 */

export const fetchOracleData = async (
  banks: { address: PublicKey; data: BankRaw }[],
  bankMetadataMap: {
    [address: string]: BankMetadata;
  },
  connection?: Connection,
  opts?: { useApiEndpoint?: boolean }
): Promise<{
  bankOraclePriceMap: Map<string, OraclePrice>;
  pythFeedMap: PythPushFeedIdMap;
}> => {
  const [pythData, swbData] = await Promise.all([
    fetchPythOracleData(banks, bankMetadataMap, connection, opts),
    fetchSwbOracleData(banks, opts),
  ]);

  const bankOraclePriceMap = new Map<string, OraclePrice>();

  // Map pyth data
  pythData.bankOraclePriceMap.forEach((oraclePrice, bankAddress) => {
    bankOraclePriceMap.set(bankAddress, oraclePrice);
  });

  // Map swb data
  swbData.bankOraclePriceMap.forEach((oraclePrice, bankAddress) => {
    bankOraclePriceMap.set(bankAddress, oraclePrice);
  });

  // check if any bank is missing an oracle price
  banks.forEach((bank) => {
    if (!bankOraclePriceMap.has(bank.address.toBase58())) {
      // console.error(`Bank ${bank.address.toBase58()} is missing an oracle price`);

      bankOraclePriceMap.set(bank.address.toBase58(), {
        priceRealtime: {
          price: BigNumber(0),
          confidence: BigNumber(0),
          lowestPrice: BigNumber(0),
          highestPrice: BigNumber(0),
        },
        priceWeighted: {
          price: BigNumber(0),
          confidence: BigNumber(0),
          lowestPrice: BigNumber(0),
          highestPrice: BigNumber(0),
        },
        timestamp: BigNumber(0),
      });
    }
  });

  return {
    bankOraclePriceMap,
    pythFeedMap: pythData.pythFeedMap,
  };
};
