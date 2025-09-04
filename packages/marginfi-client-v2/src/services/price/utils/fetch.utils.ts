import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import { BankMetadata, WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { BankRaw } from "../../bank";
import { PythPushFeedIdMap, buildFeedIdMap } from "../../../utils";

import { OraclePrice, PriceWithConfidence } from "../types";
import BN from "bn.js";
import { parseSwbOraclePriceData, vendor } from "../../..";

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
  const pythFeedMapPromise =
    pythPushBanks.length > 0
      ? fetch(
          "/api/bankData/pythFeedMap?feedIds=" +
            pythPushBanks.map((bank) => bank.data.config.oracleKeys[0].toBase58()).join(",")
        )
      : undefined;
  const encodedQuery = encodeURIComponent(JSON.stringify(voteAccMintTuples));
  const stakedCollatDataPromise = fetch(`/api/stakeData/stakedCollatData?voteAccMintTuple=${encodedQuery}`);

  const [pythFeedMapResponse, stakedCollatDataResponse] = await Promise.all([
    pythFeedMapPromise,
    stakedCollatDataPromise,
  ]);

  if (pythFeedMapResponse && !pythFeedMapResponse?.ok) {
    throw new Error("Failed to fetch pyth feed map");
  }
  if (!stakedCollatDataResponse.ok) {
    throw new Error("Failed to fetch staked collateral data");
  }

  const pythFeedMapJson: PythFeedMapResponse = (await pythFeedMapResponse?.json()) ?? {};
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
  pythPushBanks: { address: PublicKey; data: BankRaw }[]
): string[] => {
  const legacyKeys = pythLegacyBanks.map((bank) => bank.data.config.oracleKeys[0].toBase58());
  const pushKeys = pythPushBanks.map((bank) => bank.data.config.oracleKeys[0].toBase58());

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
  oraclePrices: Record<string, OraclePrice>
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
    const oracleKey = bank.data.config.oracleKeys[0].toBase58();
    const oraclePrice = oraclePrices[oracleKey];
    if (oraclePrice) {
      bankOraclePriceMap.set(bank.address.toBase58(), oraclePrice);
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
  stakedCollateralData: {
    pythStakedCollateralBanks: { address: PublicKey; data: BankRaw }[];
    priceCoeffByStakedBank: Record<string, number>;
  };
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
  let priceCoeffByStakedBank: Record<string, number>;

  if (opts?.useApiEndpoint || !connection) {
    const { priceCoeffByBank: voteAccCoeffs, pythFeedMap: feedIdMap } = await fetchPythDataViaAPI(
      pythPushBanks,
      voteAccMintTuples
    );
    priceCoeffByStakedBank = convertVoteAccCoeffsToBankCoeffs(
      pythStakedCollateralBanks,
      bankMetadataMap,
      voteAccCoeffs
    );
    pythFeedMap = feedIdMap;
  } else {
    const result = await fetchPythDataDirect(banks, connection);
    pythFeedMap = result.pythFeedMap;
    priceCoeffByStakedBank = result.priceCoeffByBank;
  }

  // Step 4: Extract oracle keys for price fetching
  const pythOracleKeys = extractPythOracleKeys(pythMigratedBanks, pythPushBanks);

  // Step 5: Fetch oracle prices
  let oraclePrices: Record<string, OraclePrice>;
  if (opts?.useApiEndpoint) {
    oraclePrices = await fetchPythOraclePricesViaAPI(pythOracleKeys);
  } else {
    // Handle non-API endpoint case - placeholder for now
    oraclePrices = {};
  }

  // Step 6: Map banks to oracle prices
  const bankOraclePriceMap = mapPythBanksToOraclePrices(pythMigratedBanks, pythPushBanks, oraclePrices);

  return {
    pythFeedMap,
    bankOraclePriceMap,
    stakedCollateralData: {
      pythStakedCollateralBanks,
      priceCoeffByStakedBank,
    },
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

  let oracleKeyMap: Record<string, { feedId: string; stdev: string; rawPrice: string }>;

  if (opts?.useApiEndpoint) {
    const { oracleKeyMap: swbOracleKeyMap } = await fetchSwbDataViaAPI(switchboardBanks);
    oracleKeyMap = swbOracleKeyMap;
  } else {
    oracleKeyMap = {};
  }

  // Step 4: Extract oracle keys for price fetching
  const swbFeedIds: string[] = [];
  const brokenSwbFeeds: { feedId: string; mintAddress: string }[] = [];

  Object.keys(oracleKeyMap).forEach((oracleKey) => {
    const oracleAiData = oracleKeyMap[oracleKey]!;

    const rawPriceBN = new BN(oracleAiData.rawPrice);

    const isFeedBroken = rawPriceBN.isZero() || rawPriceBN.eq(new BN(0.000001)) || rawPriceBN.eq(new BN(0.00000001));

    if (isFeedBroken) {
      const bank = switchboardBanks.find((bank) => bank.data.config.oracleKeys[0]!.toBase58() === oracleKey);
      if (bank) {
        brokenSwbFeeds.push({
          feedId: oracleAiData.feedId,
          mintAddress: bank.data.mint.toBase58(),
        });
      } else {
        console.warn(`Bank not found for oracle key ${oracleKey} - feed id ${oracleAiData.feedId}`);
      }
    } else {
      swbFeedIds.push(oracleAiData.feedId);
    }
  });

  // Step 5: Fetch oracle prices
  let crossbarResponse: Record<string, vendor.FeedResponse | undefined>;
  let birdeyeResponse: Record<string, number> = {};

  if (opts?.useApiEndpoint) {
    crossbarResponse = await fetchSwbOraclePricesViaAPI(swbFeedIds);
    if (brokenSwbFeeds.length > 0) {
      birdeyeResponse = await getBirdeyeFallbackPricesByFeedId(brokenSwbFeeds);
    }
  } else {
    // Handle non-API endpoint case - placeholder for now
    crossbarResponse = {};
    birdeyeResponse = {};
  }

  // Step 6: Map switchboardBanks to oracle prices
  const bankOraclePriceMap = mapSwbBanksToOraclePrices(switchboardBanks, oracleKeyMap, crossbarResponse);

  // Step 7: Map broken feeds to oracle prices
  const brokenFeedOraclePriceMap = mapBrokenFeedsToOraclePrices(switchboardBanks, oracleKeyMap, birdeyeResponse);

  // Step 8: Combine bank oracle prices and broken feed oracle prices
  const combinedOraclePriceMap = new Map<string, OraclePrice>();
  bankOraclePriceMap.forEach((oraclePrice, bankAddress) => {
    combinedOraclePriceMap.set(bankAddress, oraclePrice);
  });
  brokenFeedOraclePriceMap.forEach((oraclePrice, bankAddress) => {
    combinedOraclePriceMap.set(bankAddress, oraclePrice);
  });

  return {
    bankOraclePriceMap: combinedOraclePriceMap,
  };
};

/**
 * Fetches Pyth feed map and staked collateral data via API endpoints
 */
const fetchSwbDataViaAPI = async (
  swbPullBanks: { address: PublicKey; data: BankRaw }[]
): Promise<{ oracleKeyMap: Record<string, { feedId: string; stdev: string; rawPrice: string }> }> => {
  const swbOracleKeyMapResponse = await fetch(
    "/api/bankData/swbOracleMap?oracleKeys=" +
      swbPullBanks.map((bank) => bank.data.config.oracleKeys[0].toBase58()).join(",")
  );

  if (!swbOracleKeyMapResponse.ok) {
    throw new Error("Failed to fetch swb oracle key map");
  }

  const swbOracleKeyMapJson: Record<string, { feedId: string; stdev: string; rawPrice: string }> =
    await swbOracleKeyMapResponse.json();

  return { oracleKeyMap: swbOracleKeyMapJson };
};

const fetchSwbOraclePricesViaAPI = async (
  swbFeedIds: string[]
): Promise<Record<string, vendor.FeedResponse | undefined>> => {
  const response = await fetch("/api/bankData/swbOracleData?feedIds=" + swbFeedIds.join(","));

  if (!response.ok) {
    throw new Error("Failed to fetch swb oracle data");
  }

  return await response.json();
};

export type SwbOracleAiDataByKey = Record<string, { feedId: string; stdev: string; rawPrice: string }>;

/**
 * Maps Switchboard banks to their corresponding oracle prices using feed data and crossbar responses
 * @param banks - Array of bank objects with address and raw bank data
 * @param swbOracleAiDataByKey - Oracle account information indexed by oracle key
 * @param crossbarResponse - Crossbar feed response data indexed by feed ID
 * @returns Map of bank addresses to their corresponding oracle prices
 */
export const mapSwbBanksToOraclePrices = (
  banks: { address: PublicKey; data: BankRaw }[],
  swbOracleAiDataByKey: SwbOracleAiDataByKey,
  crossbarResponse: Record<string, vendor.FeedResponse | undefined>
): Map<string, OraclePrice> => {
  const bankOraclePriceMap = new Map<string, OraclePrice>();

  banks.forEach((bank) => {
    const oracleKey = bank.data.config.oracleKeys[0]!.toBase58();
    const oracleData = swbOracleAiDataByKey[oracleKey];
    const oracleFeed = oracleData?.feedId;
    if (oracleFeed && oracleData && crossbarResponse) {
      const crossbarData = crossbarResponse[oracleFeed]?.results;
      const timestamp = new Date().getTime().toString();

      const oraclePrice = parseSwbOraclePriceData(
        crossbarData ?? new BN(oracleData.rawPrice),
        new BN(oracleData.stdev),
        timestamp
      );
      if (oraclePrice) {
        bankOraclePriceMap.set(bank.address.toBase58(), oraclePrice);
      }
    } else {
      console.warn(`No oracle feed found for bank ${bank.address.toBase58()} oracleKey ${oracleKey}`);
    }
  });

  return bankOraclePriceMap;
};

/**
 * Maps broken Switchboard feeds to oracle prices using Birdeye fallback data
 * @param banks - Array of bank objects with address and raw bank data
 * @param swbOracleAiDataByKey - Oracle account information indexed by oracle key
 * @param birdeyeResponse - Birdeye price data indexed by feed ID
 * @returns Map of bank addresses to their corresponding oracle prices from Birdeye fallback
 */
const mapBrokenFeedsToOraclePrices = (
  banks: { address: PublicKey; data: BankRaw }[],
  swbOracleAiDataByKey: SwbOracleAiDataByKey,
  birdeyeResponse: Record<string, number>
): Map<string, OraclePrice> => {
  const bankOraclePriceMap = new Map<string, OraclePrice>();

  banks.forEach((bank) => {
    const oracleKey = bank.data.config.oracleKeys[0]!.toBase58();
    const oracleData = swbOracleAiDataByKey[oracleKey];
    const oracleFeed = oracleData?.feedId;
    const birdeyeData = oracleFeed ? birdeyeResponse[oracleFeed] : undefined;
    if (oracleFeed && oracleData && birdeyeData) {
      const timestamp = new Date().getTime().toString();

      const oraclePrice = parseSwbOraclePriceData([birdeyeData], new BN(oracleData.stdev), timestamp);
      if (oraclePrice) {
        bankOraclePriceMap.set(bank.address.toBase58(), oraclePrice);
      }
    } else {
      // Bank not found in birdeye fallback skipping
    }
  });

  return bankOraclePriceMap;
};

/**
 * Fetches Birdeye fallback prices and maps them by feed ID
 * @param feedMint - Array of objects containing feedId and mintAddress pairs
 * @returns Promise resolving to record of prices indexed by feed ID
 */
const getBirdeyeFallbackPricesByFeedId = async (
  feedMint: {
    feedId: string;
    mintAddress: string;
  }[]
): Promise<Record<string, number>> => {
  const mintAddresses = feedMint.map((feedMint) => feedMint.mintAddress);
  const prices = await getBirdeyePricesForMints(mintAddresses);

  const priceByFeedId: Record<string, number> = {};
  feedMint.forEach((feedMint) => {
    const feedId = feedMint.feedId;
    const mintAddress = feedMint.mintAddress;
    const price = prices[mintAddress];

    if (price) {
      priceByFeedId[feedId] = price;
    }
  });

  return priceByFeedId;
};

interface BirdeyeTokenPriceResponse {
  success: boolean;
  data: Record<string, { value: number; updateUnixTime: number; updateHumanTime: string }>;
}

/**
 * Fetches Birdeye prices for specific mint addresses using the existing /api/tokens/multi endpoint.
 *
 * @param mintAddresses - Array of mint addresses to fetch prices for
 * @returns Promise resolving to a record mapping mint addresses to their price values
 */
async function getBirdeyePricesForMints(mintAddresses: string[]): Promise<Record<string, number>> {
  try {
    const url = `/api/tokens/multi?mintList=${mintAddresses.join(",")}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Response is not ok");
    }

    const data: BirdeyeTokenPriceResponse = await response.json();
    if (!data.success) {
      throw new Error("Success field is false");
    }
    const rawPrices = data.data || {};

    const extractedPrices: Record<string, number> = {};
    Object.entries(rawPrices).forEach(([mint, priceData]) => {
      extractedPrices[mint] = priceData.value;
    });

    return extractedPrices;
  } catch (error) {
    // TODO: add sentry logging
    console.warn("Error fetching Birdeye prices for static feeds:", error);
    return {};
  }
}

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

  // Get SOL bank
  const solBank = banks.find((bank) => bank.data.mint?.equals(WSOL_MINT));
  const oraclePriceSol = bankOraclePriceMap.get(solBank?.address.toBase58() ?? "");

  if (!solBank || !oraclePriceSol) {
    console.error("SOL BANK NOT FOUND!");
  } else {
    const stakedBankOraclePriceMap = adjustPricesStakedCollateral(pythData.stakedCollateralData, oraclePriceSol);

    stakedBankOraclePriceMap.forEach((oraclePrice, bankAddress) => {
      bankOraclePriceMap.set(bankAddress, oraclePrice);
    });
  }

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

export const adjustPricesStakedCollateral = (
  stakedCollateralData: {
    pythStakedCollateralBanks: { address: PublicKey; data: BankRaw }[];
    priceCoeffByStakedBank: Record<string, number>;
  },
  solOraclePrice: OraclePrice
) => {
  const { pythStakedCollateralBanks, priceCoeffByStakedBank } = stakedCollateralData;

  console.log("stakedCollateralData", stakedCollateralData);

  const stakedBankOraclePriceMap = new Map<string, OraclePrice>();
  // Map staked collateral banks with price coefficient adjustment
  pythStakedCollateralBanks.forEach((bank) => {
    const priceCoeff = priceCoeffByStakedBank[bank.address.toBase58()];
    const oracleKey = bank.data.config.oracleKeys[0].toBase58();

    if (oracleKey && priceCoeff !== undefined) {
      const oraclePrice = solOraclePrice;
      stakedBankOraclePriceMap.set(bank.address.toBase58(), {
        timestamp: oraclePrice.timestamp,
        priceRealtime: adjustPriceComponent(oraclePrice.priceRealtime, priceCoeff),
        priceWeighted: adjustPriceComponent(oraclePrice.priceWeighted, priceCoeff),
      });
    }
  });

  return stakedBankOraclePriceMap;
};
