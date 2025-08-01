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
import { chunkedGetRawMultipleAccountInfoOrdered, median, Wallet } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { NextApiRequest, NextApiResponse } from "next";
import config from "~/config/marginfi";
import { OraclePriceString, PoolListApiResponse } from "~/types/api.types";

const SWITCHBOARD_CROSSSBAR_API = process.env.SWITCHBOARD_CROSSSBAR_API || "https://crossbar.switchboard.xyz";
const IS_SWB_STAGE = SWITCHBOARD_CROSSSBAR_API === "https://staging.crossbar.switchboard.xyz";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let baseUrl = extractHost(req.headers.origin) || extractHost(req.headers.referer);

    if (!baseUrl) {
      return res.status(400).json({ error: "Invalid input: expected a valid host." });
    }

    const poolList: PoolListApiResponse[] = await fetch(`${baseUrl}/api/pool/list`)
      .then((response) => response.json())
      .catch((error) => {
        throw new Error("Error fetching pool list", error);
      });

    const requestedTokenBanks = poolList.map((pool) => pool.base_bank.address);
    const requestedQuoteBanks = poolList.map((pool) => pool.quote_bank.address);

    const requestedBanks = [...requestedTokenBanks, ...requestedQuoteBanks];

    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");
    const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;
    const provider = new AnchorProvider(connection, {} as Wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const program = new Program(idl, provider) as any as MarginfiProgram;

    let updatedOraclePrices = new Map<string, OraclePrice>();

    // Fetch on-chain data for all banks
    const banksAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, requestedBanks);
    let banksMap: { address: PublicKey; data: BankRaw }[] = banksAis.map((account, index) => ({
      address: new PublicKey(requestedBanks[index]),
      data: Bank.decodeBankRaw(account.data, program.idl),
    }));

    // restrict host to app domain if not swb stage link
    let host = IS_SWB_STAGE
      ? process.env.SWITCHBOARD_STAGE_URL
      : extractHost(req.headers.origin) || extractHost(req.headers.referer);
    if (!host) {
      return res.status(400).json({ error: "Invalid input: expected a valid host." });
    }

    const feedIdMapRaw: Record<string, string> = await fetch(`${host}/api/oracle/pythFeedMapV2`, {
      headers: {
        origin: req.headers.origin || "",
        referer: req.headers.referer || "",
      },
    }).then((response) => response.json());

    const feedIdMap: PythPushFeedIdMap = new Map(
      Object.entries(feedIdMapRaw).map(([key, value]) => [key, { feedId: new PublicKey(value) }])
    );

    const oracleMintMap = new Map<string, PublicKey>();
    const feedHashMintMap = new Map<string, PublicKey>();

    const requestedOraclesData = banksMap.map((b) => {
      const oracleKey = findOracleKey(BankConfig.fromAccountParsed(b.data.config)).oracleKey.toBase58();
      oracleMintMap.set(oracleKey, b.data.mint);

      return {
        oracleKey,
        oracleSetup: parseOracleSetup(b.data.config.oracleSetup),
        maxAge: b.data.config.oracleMaxAge,
        bankPk: b.address,
      };
    });
    // Fetch on-chain data for all oracles
    const oracleAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, [
      ...requestedOraclesData.map((oracleData) => oracleData.oracleKey),
    ]);
    let swbPullOraclesStale: { data: OracleDataWithTimestamp; feedHash: string }[] = [];
    for (const index in requestedOraclesData) {
      const oracleData = requestedOraclesData[index];
      const priceDataRaw = oracleAis[index];
      const mintData = oracleMintMap.get(oracleData.oracleKey)!;
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

      // If on-chain data is recent enough, use it even for SwitchboardPull oracles
      if (oracleData.oracleSetup === OracleSetup.SwitchboardPull && isStale) {
        const feedHash = Buffer.from(vendor.decodeSwitchboardPullFeedData(priceDataRaw.data).feed_hash).toString("hex");
        feedHashMintMap.set(feedHash, mintData);
        swbPullOraclesStale.push({
          data: { ...oracleData, timestamp: oraclePrice.timestamp },
          feedHash: feedHash,
        });
        continue;
      }

      updatedOraclePrices.set(oracleData.oracleKey, oraclePrice);
    }

    if (swbPullOraclesStale.length > 0) {
      // Batch-fetch and cache price data from Crossbar for stale SwitchboardPull oracles
      const feedHashes = swbPullOraclesStale.map((value) => value.feedHash);
      const crossbarPrices = await handleFetchCrossbarPrices(feedHashes, feedHashMintMap);

      for (const {
        data: { oracleKey, timestamp },
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

        const updatedOraclePrice = { ...crossbarPrice, timestamp } as OraclePrice;

        updatedOraclePrices.set(oracleKey, updatedOraclePrice);
      }
    }
    const bankPkMap = new Map<string, OraclePrice>();

    requestedOraclesData.forEach((oracleData) => {
      const oraclePrice = updatedOraclePrices.get(oracleData.oracleKey)!;
      bankPkMap.set(oracleData.bankPk.toBase58(), oraclePrice);
    });

    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);
    return res.status(200).json(stringifyOraclePriceMap(bankPkMap));
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}

function stringifyOraclePriceMap(oraclePriceMap: Map<string, OraclePrice>) {
  let oraclePriceMap2: Record<string, OraclePriceString> = {};
  oraclePriceMap.forEach((value, key) => {
    oraclePriceMap2[key] = stringifyOraclePrice(value);
  });
  return oraclePriceMap2;
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
    brokenFeeds = mainBrokenFeeds;

    payload.push(...mainPayload);

    if (!mainBrokenFeeds.length) {
      return crossbarPayloadToOraclePricePerFeedHash(payload);
    }

    if (process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK) {
      // fallback crossbar
      const { payload: fallbackPayload, brokenFeeds: fallbackBrokenFeeds } = await fetchCrossbarPrices(
        brokenFeeds,
        process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK
      );
      brokenFeeds = fallbackBrokenFeeds;
      payload.push(...fallbackPayload);

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
  }, 6000);

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

  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  // Fetch from API and update cache
  try {
    const response = await fetch(`${BIRDEYE_API}/defi/multi_price?list_address=${tokens.join("%2C")}`, {
      headers: {
        Accept: "application/json",
        "x-chain": "solana",
        "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = (await response.json()) as BirdeyePriceResponse;
    return data;
  } catch (error) {
    throw new Error("Error fetching birdey prices");
  }
}
