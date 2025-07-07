import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  Bank,
  BankConfig,
  BankRaw,
  findOracleKey,
  MARGINFI_IDL,
  MarginfiIdlType,
  MarginfiProgram,
  OraclePrice,
  OracleSetup,
  parseOracleSetup,
  parsePriceInfo,
  PythPushFeedIdMap,
  vendor,
} from "@mrgnlabs/marginfi-client-v2";

import {
  chunkedGetRawMultipleAccountInfoOrdered,
  loadBankMetadatas,
  median,
  MintLayout,
  RawMint,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { NextApiRequest, NextApiResponse } from "next";
import config from "~/config/marginfi";

const SWITCHBOARD_CROSSSBAR_API = process.env.SWITCHBOARD_CROSSSBAR_API || "https://crossbar.switchboard.xyz";
const IS_SWB_STAGE = SWITCHBOARD_CROSSSBAR_API === "https://staging.crossbar.switchboard.xyz";
const STAKING_BANKS =
  process.env.NEXT_PUBLIC_STAKING_BANKS ||
  "https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache.json";

const S_MAXAGE_TIME = 10;
const STALE_WHILE_REVALIDATE_TIME = 15;

interface OracleData {
  oracleKey: string;
  oracleSetup: OracleSetup;
  maxAge: number;
}

interface OracleDataWithTimestamp extends OracleData {
  timestamp: BigNumber;
}

interface PriceWithConfidenceString {
  price: string;
  confidence: string;
  lowestPrice: string;
  highestPrice: string;
}

interface OraclePriceString {
  priceRealtime: PriceWithConfidenceString;
  priceWeighted: PriceWithConfidenceString;
  timestamp?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestedBanksRaw = req.query.banks;

  if (!requestedBanksRaw || typeof requestedBanksRaw !== "string") {
    return res.status(400).json({ error: "Invalid input: expected an array of bank base58-encoded addresses." });
  }

  const requestedBanks = requestedBanksRaw.split(",").map((bankAddress) => bankAddress.trim());

  const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");
  const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;
  const provider = new AnchorProvider(connection, {} as Wallet, {
    ...AnchorProvider.defaultOptions(),
    commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
  });
  const program = new Program(idl, provider) as any as MarginfiProgram;

  let updatedOraclePriceByBank = new Map<string, OraclePrice>();

  try {
    // Fetch on-chain data for all banks
    const banksAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, requestedBanks);
    let banksMap: { address: PublicKey; data: BankRaw }[] = banksAis.map((account, index) => ({
      address: new PublicKey(requestedBanks[index]),
      data: Bank.decodeBankRaw(account.data, program.idl),
    }));

    let host = IS_SWB_STAGE
      ? process.env.SWITCHBOARD_STAGE_URL
      : extractHost(req.headers.origin) || extractHost(req.headers.referer);
    if (!host) {
      return res.status(400).json({ error: "Invalid input: expected a valid host." });
    }
    const feedIdMapRaw: Record<string, { feedId: string; shardId?: number }> = await fetch(
      `${host}/api/oracle/pythFeedMap?groupPk=${banksMap[0].data.group.toBase58()}`
    ).then((response) => response.json());
    const feedIdMap: PythPushFeedIdMap = new Map(
      Object.entries(feedIdMapRaw).map(([key, value]) => [
        key,
        { feedId: new PublicKey(value.feedId), shardId: value.shardId },
      ])
    );

    const feedHashMintMap = new Map<string, PublicKey>();

    const requestedOraclesData = banksMap.map((b) => {
      const oracleKey = findOracleKey(BankConfig.fromAccountParsed(b.data.config), feedIdMap).oracleKey.toBase58();

      return {
        bankAddress: b.address,
        mint: b.data.mint,
        oracleKey,
        oracleSetup: parseOracleSetup(b.data.config.oracleSetup),
        maxAge: b.data.config.oracleMaxAge,
      };
    });

    // Fetch on-chain data for all oracles
    const oracleAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, [
      ...requestedOraclesData.map((oracleData) => oracleData.oracleKey),
    ]);
    let swbPullOraclesStale: { data: OracleDataWithTimestamp; feedHash: string; bankAddress: PublicKey }[] = [];
    let pythStakedCollateralOracles: { data: OraclePrice; mint: PublicKey; key: string }[] = [];
    for (const index in requestedOraclesData) {
      const oracleData = requestedOraclesData[index];
      const priceDataRaw = oracleAis[index];
      let oraclePrice = parsePriceInfo(oracleData.oracleSetup, priceDataRaw.data);

      if (oraclePrice.priceRealtime.price.isNaN()) {
        oraclePrice = {
          ...oraclePrice,
          priceRealtime: {
            price: new BigNumber(0),
            confidence: new BigNumber(0),
            lowestPrice: new BigNumber(0),
            highestPrice: new BigNumber(0),
          },
          priceWeighted: {
            price: new BigNumber(0),
            confidence: new BigNumber(0),
            lowestPrice: new BigNumber(0),
            highestPrice: new BigNumber(0),
          },
        };
      }

      const currentTime = Math.round(Date.now() / 1000);
      const oracleTime = oraclePrice.timestamp.toNumber();
      const maxAge = oracleData.maxAge + S_MAXAGE_TIME; // add some buffer to maxAge to account for api route cache
      const isStale = currentTime - oracleTime > maxAge;

      if (oracleData.oracleSetup === OracleSetup.StakedWithPythPush) {
        pythStakedCollateralOracles.push({
          data: oraclePrice,
          key: oracleData.bankAddress.toBase58(),
          mint: oracleData.mint,
        });
        continue;
      }

      // If on-chain data is recent enough, use it even for SwitchboardPull oracles
      if (oracleData.oracleSetup === OracleSetup.SwitchboardPull && isStale) {
        const feedHash = Buffer.from(vendor.decodeSwitchboardPullFeedData(priceDataRaw.data).feed_hash).toString("hex");
        feedHashMintMap.set(feedHash, oracleData.mint);
        swbPullOraclesStale.push({
          data: { ...oracleData, timestamp: oraclePrice.timestamp },
          feedHash: feedHash,
          bankAddress: oracleData.bankAddress,
        });
        continue;
      }

      updatedOraclePriceByBank.set(oracleData.bankAddress.toBase58(), oraclePrice);
    }

    if (pythStakedCollateralOracles.length > 0) {
      const stakedCollatMap: Record<
        string,
        {
          bankAddress: PublicKey;
          mint: PublicKey;
          stakePoolAddress: PublicKey;
          poolAddress: PublicKey;
          oracle: OraclePrice;
        }
      > = {};
      const solPools: string[] = [];
      const mints: string[] = [];

      const bankMetadataMap = await loadBankMetadatas(`${STAKING_BANKS}?time=${new Date().getTime()}`);

      pythStakedCollateralOracles.forEach((bankObj) => {
        const { key: bankAddress } = bankObj;
        const bankMetadata = bankMetadataMap[bankAddress];
        if (bankMetadata && bankMetadata.validatorVoteAccount) {
          const poolAddress = vendor.findPoolAddress(new PublicKey(bankMetadata.validatorVoteAccount));
          const stakePoolAddress = vendor.findPoolStakeAddress(poolAddress);

          stakedCollatMap[bankAddress] = {
            bankAddress: new PublicKey(bankAddress),
            mint: new PublicKey(bankMetadata.tokenAddress),
            stakePoolAddress,
            poolAddress,
            oracle: bankObj.data,
          };
          solPools.push(stakePoolAddress.toBase58());
          mints.push(bankMetadata.tokenAddress);
        }
      });
      const dataAis = await chunkedGetRawMultipleAccountInfoOrdered(program.provider.connection, [
        ...mints,
        ...solPools,
      ]);
      const stakePoolsAis: vendor.StakeAccount[] = dataAis
        .slice(mints.length)
        .map((ai) => vendor.getStakeAccount(ai.data));
      const lstMintsAis: RawMint[] = dataAis.slice(0, mints.length).map((mintAi) => MintLayout.decode(mintAi.data));

      const lstMintRecord: Record<string, RawMint> = Object.fromEntries(mints.map((mint, i) => [mint, lstMintsAis[i]]));
      const solPoolsRecord: Record<string, vendor.StakeAccount> = Object.fromEntries(
        solPools.map((poolKey, i) => [poolKey, stakePoolsAis[i]])
      );

      for (const index in stakedCollatMap) {
        const { bankAddress, mint, stakePoolAddress, poolAddress, oracle } = stakedCollatMap[index];
        const stakeAccount = solPoolsRecord[stakePoolAddress.toBase58()];
        const tokenSupply = lstMintRecord[mint.toBase58()].supply;

        const stakeActual = Number(stakeAccount.stake.delegation.stake);

        if (oracle) {
          const adjustPrice = (price: BigNumber, stakeActual: number, tokenSupply: bigint) => {
            return Number(tokenSupply) === 0
              ? price
              : new BigNumber((price.toNumber() * (stakeActual - LAMPORTS_PER_SOL)) / Number(tokenSupply));
          };

          const adjustPriceComponent = (priceComponent: any, stakeActual: number, tokenSupply: bigint) => ({
            price: adjustPrice(priceComponent.price, stakeActual, tokenSupply),
            confidence: priceComponent.confidence,
            lowestPrice: adjustPrice(priceComponent.lowestPrice, stakeActual, tokenSupply),
            highestPrice: adjustPrice(priceComponent.highestPrice, stakeActual, tokenSupply),
          });

          const oraclePrice = {
            timestamp: oracle.timestamp,
            priceRealtime: adjustPriceComponent(oracle.priceRealtime, stakeActual, tokenSupply),
            priceWeighted: adjustPriceComponent(oracle.priceWeighted, stakeActual, tokenSupply),
          };

          updatedOraclePriceByBank.set(bankAddress.toBase58(), oraclePrice);
        }
      }
    }

    if (swbPullOraclesStale.length > 0) {
      // Batch-fetch and cache price data from Crossbar for stale SwitchboardPull oracles
      const feedHashes = swbPullOraclesStale.map((value) => value.feedHash);
      let crossbarPrices = await handleFetchCrossbarPrices(feedHashes, feedHashMintMap);

      for (const {
        data: { timestamp },
        bankAddress,
        feedHash,
      } of swbPullOraclesStale) {
        let crossbarPrice = crossbarPrices.get(feedHash);
        if (!crossbarPrice || crossbarPrice.priceRealtime.price.isNaN()) {
          crossbarPrice = {
            timestamp: crossbarPrice?.timestamp ?? timestamp,
            priceRealtime: {
              price: new BigNumber(0),
              confidence: new BigNumber(0),
              lowestPrice: new BigNumber(0),
              highestPrice: new BigNumber(0),
            },
            priceWeighted: {
              price: new BigNumber(0),
              confidence: new BigNumber(0),
              lowestPrice: new BigNumber(0),
              highestPrice: new BigNumber(0),
            },
          };
        }

        let updatedOraclePrice = { ...crossbarPrice, timestamp } as OraclePrice;

        updatedOraclePriceByBank.set(bankAddress.toBase58(), updatedOraclePrice);
      }
    }

    const updatedOraclePricesSorted = requestedOraclesData.map(
      (value) => updatedOraclePriceByBank.get(value.bankAddress.toBase58())!
    );

    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);
    return res.status(200).json(updatedOraclePricesSorted.map(stringifyOraclePrice));
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}

async function handleFetchCrossbarPrices(
  feedHashes: string[],
  mintMap: Map<string, PublicKey>
): Promise<Map<string, OraclePrice>> {
  try {
    // main crossbar
    const payload: vendor.CrossbarSimulatePayload = [];
    let brokenFeeds: string[] = [];

    const { payload: mainPayload, brokenFeeds: mainBrokenFeeds } = await fetchCrossbarPrices(
      feedHashes,
      SWITCHBOARD_CROSSSBAR_API
    );

    payload.push(...mainPayload);
    brokenFeeds = mainBrokenFeeds;

    if (!mainBrokenFeeds.length) {
      return crossbarPayloadToOraclePricePerFeedHash(payload);
    }

    if (process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK) {
      // fallback crossbar
      const { payload: fallbackPayload, brokenFeeds: fallbackBrokenFeeds } = await fetchCrossbarPrices(
        brokenFeeds,
        process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK,
        process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK_USERNAME,
        process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK_BEARER
      );
      payload.push(...fallbackPayload);
      brokenFeeds = fallbackBrokenFeeds;
      if (!fallbackBrokenFeeds.length) {
        return crossbarPayloadToOraclePricePerFeedHash(payload);
      }
    }

    // birdeye as last resort
    const { payload: birdeyePayload, brokenFeeds: birdeyeBrokenFeeds } = await fetchBirdeyePrices(brokenFeeds, mintMap);

    payload.push(...birdeyePayload);

    birdeyeBrokenFeeds.forEach((feed) => {
      payload.push({
        feedHash: feed,
        results: [0],
      });
    });

    return crossbarPayloadToOraclePricePerFeedHash(payload);
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Couldn't fetch from crossbar");
  }
}

async function fetchBirdeyePrices(
  feedHashes: string[],
  mintMap: Map<string, PublicKey>
): Promise<{ payload: vendor.CrossbarSimulatePayload; brokenFeeds: string[] }> {
  try {
    const brokenFeeds: string[] = [];

    const tokens = feedHashes
      .map((feedHash) => {
        const mint = mintMap.get(feedHash)?.toBase58();
        if (!mint) {
          console.error("Error:", `Mint not found for feedHash ${feedHash}`);
          brokenFeeds.push(feedHash);
        }
        return mint;
      })
      .filter((mint): mint is string => mint !== undefined);

    const response = await fetchMultiPrice(tokens);

    const priceData = response.data;

    const finalPayload: vendor.CrossbarSimulatePayload = feedHashes.map((feedHash) => {
      const tokenAddress = mintMap.get(feedHash)!.toBase58();
      const price = priceData[tokenAddress];
      return {
        feedHash,
        results: [price.value],
      };
    });

    return { payload: finalPayload, brokenFeeds };
  } catch (error) {
    console.log("Error:", "fetch from birdeye failed");
    return { payload: [], brokenFeeds: feedHashes };
  }
}

async function fetchCrossbarPrices(
  feedHashes: string[],
  endpoint: string,
  username?: string,
  bearer?: string
): Promise<{ payload: vendor.CrossbarSimulatePayload; brokenFeeds: string[] }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 8000);

  const isAuth = username && bearer;

  const isCrossbarMain = endpoint.includes("switchboard.xyz");

  const basicAuth = isAuth ? Buffer.from(`${username}:${bearer}`).toString("base64") : undefined;

  try {
    const feedHashesString = feedHashes.join(",");
    const response = await fetch(`${endpoint}/simulate/${feedHashesString}`, {
      headers: {
        Authorization: basicAuth ? `Basic ${basicAuth}` : "",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const payload = (await response.json()) as vendor.CrossbarSimulatePayload;

    const brokenFeeds = payload
      .filter((feed) => {
        const result = feed.results[0];
        return result === null || result === undefined || isNaN(Number(result));
      })
      .map((feed) => feed.feedHash);

    const finalPayload = payload.filter((feed) => !brokenFeeds.includes(feed.feedHash));

    return { payload: finalPayload, brokenFeeds: brokenFeeds };
  } catch (error) {
    const errorMessage = isCrossbarMain ? "Couldn't fetch from crossbar" : "Couldn't fetch from fallback crossbar";
    console.log("Error:", errorMessage);
    return { payload: [], brokenFeeds: feedHashes };
  }
}

function crossbarPayloadToOraclePricePerFeedHash(payload: vendor.CrossbarSimulatePayload): Map<string, OraclePrice> {
  const oraclePrices: Map<string, OraclePrice> = new Map();
  for (const feedResponse of payload) {
    const oraclePrice = crossbarFeedResultToOraclePrice(feedResponse);
    oraclePrices.set(feedResponse.feedHash, oraclePrice);
  }
  return oraclePrices;
}

function crossbarFeedResultToOraclePrice(feedResponse: vendor.FeedResponse): OraclePrice {
  let medianPrice = new BigNumber(median(feedResponse.results));

  const priceRealtime = {
    price: medianPrice,
    confidence: new BigNumber(0),
    lowestPrice: medianPrice,
    highestPrice: medianPrice,
  };

  const priceWeighted = {
    price: medianPrice,
    confidence: new BigNumber(0),
    lowestPrice: medianPrice,
    highestPrice: medianPrice,
  };

  return {
    priceRealtime,
    priceWeighted,
    timestamp: new BigNumber(Math.floor(new Date().getTime() / 1000)),
  };
}

function stringifyOraclePrice(oraclePrice: OraclePrice): OraclePriceString {
  return {
    priceRealtime: {
      price: oraclePrice.priceRealtime.price.toString(),
      confidence: oraclePrice.priceRealtime.confidence.toString(),
      lowestPrice: oraclePrice.priceRealtime.lowestPrice.toString(),
      highestPrice: oraclePrice.priceRealtime.highestPrice.toString(),
    },
    priceWeighted: {
      price: oraclePrice.priceWeighted.price.toString(),
      confidence: oraclePrice.priceWeighted.confidence.toString(),
      lowestPrice: oraclePrice.priceWeighted.lowestPrice.toString(),
      highestPrice: oraclePrice.priceWeighted.highestPrice.toString(),
    },
    timestamp: oraclePrice.timestamp.toString(),
  };
}

function extractHost(referer: string | undefined): string | undefined {
  if (!referer) {
    return undefined;
  }
  const url = new URL(referer);
  return url.origin;
}

const BIRDEYE_API = "https://public-api.birdeye.so";

interface BirdeyeTokenPrice {
  value: number;
  updateUnixTime: number;
  updateHumanTime: string;
  priceChange24h: number;
}

interface BirdeyePriceResponse {
  success: boolean;
  data: {
    [tokenAddress: string]: BirdeyeTokenPrice;
  };
}

async function fetchMultiPrice(tokens: string[]): Promise<BirdeyePriceResponse> {
  if (!tokens) {
    throw new Error("No tokens provided");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const baseUrl =
      process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_BRANCH_URL
          ? `https://${process.env.VERCEL_BRANCH_URL}`
          : "http://localhost:3004";

    const response = await fetch(`${baseUrl}/api/tokens/multi?mintList=${tokens.join(",")}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = (await response.json()) as BirdeyePriceResponse;

    if (!data || !data.success) {
      throw new Error("Error fetching birdeye prices");
    }

    return data;
  } catch (error) {
    throw new Error("Error fetching birdeye prices");
  }
}
