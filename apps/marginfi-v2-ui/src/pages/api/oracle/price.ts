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
} from "@mrgnlabs/marginfi-client-v2";
import {
  CrossbarSimulatePayload,
  decodeSwitchboardPullFeedData,
  FeedResponse,
} from "@mrgnlabs/marginfi-client-v2/dist/vendor";
import { chunkedGetRawMultipleAccountInfoOrdered, median, Wallet } from "@mrgnlabs/mrgn-common";
import { push } from "@socialgouv/matomo-next";
import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { NextApiRequest, NextApiResponse } from "next";
import config from "~/config/marginfi";

const SWITCHBOARD_CROSSSBAR_API = "https://crossbar.switchboard.xyz";

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

  const connection = new Connection(
    process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || ""
  );
  const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;
  const provider = new AnchorProvider(connection, {} as Wallet, {
    ...AnchorProvider.defaultOptions(),
    commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
  });
  const program = new Program(idl, provider) as any as MarginfiProgram;

  let updatedOraclePrices = new Map<string, OraclePrice>();

  try {
    // Fetch on-chain data for all banks
    const banksAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, requestedBanks);
    let banksMap: { address: PublicKey; data: BankRaw }[] = banksAis.map((account, index) => ({
      address: new PublicKey(requestedBanks[index]),
      data: Bank.decodeBankRaw(account.data, program.idl),
    }));

    const host = extractHost(req.headers.origin) || extractHost(req.headers.referer);
    if (!host) {
      return res.status(400).json({ error: "Invalid input: expected a valid host." });
    }
    const feedIdMapRaw: Record<string, string> = await fetch(`${host}/api/oracle/pythFeedMap`).then((response) =>
      response.json()
    );
    const feedIdMap: Map<string, PublicKey> = new Map(
      Object.entries(feedIdMapRaw).map(([key, value]) => [key, new PublicKey(value)])
    );

    const mintMap = new Map<string, PublicKey>();

    const requestedOraclesData = banksMap.map((b) => {
      const oracleKey = findOracleKey(BankConfig.fromAccountParsed(b.data.config), feedIdMap).toBase58();
      mintMap.set(oracleKey, b.data.mint);

      return {
        oracleKey,
        oracleSetup: parseOracleSetup(b.data.config.oracleSetup),
        maxAge: b.data.config.oracleMaxAge,
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
      let oraclePrice = parsePriceInfo(oracleData.oracleSetup, priceDataRaw.data);

      if (oraclePrice.priceRealtime.price.isNaN()) {
        oraclePrice = {
          ...oraclePrice,
          priceRealtime: {
            ...oraclePrice.priceRealtime,
            price: new BigNumber(0),
          },
          priceWeighted: {
            ...oraclePrice.priceWeighted,
            price: new BigNumber(0),
          },
        };
      }

      const currentTime = Math.round(Date.now() / 1000);
      const oracleTime = oraclePrice.timestamp.toNumber();
      const isStale = currentTime - oracleTime > oracleData.maxAge;

      // If on-chain data is recent enough, use it even for SwitchboardPull oracles
      if (oracleData.oracleSetup === OracleSetup.SwitchboardPull && !isStale) {
        swbPullOraclesStale.push({
          data: { ...oracleData, timestamp: oraclePrice.timestamp },
          feedHash: Buffer.from(decodeSwitchboardPullFeedData(priceDataRaw.data).feed_hash).toString("hex"),
        });
        continue;
      }

      updatedOraclePrices.set(oracleData.oracleKey, oraclePrice);
    }

    if (swbPullOraclesStale.length > 0) {
      // Batch-fetch and cache price data from Crossbar for stale SwitchboardPull oracles
      const feedHashes = swbPullOraclesStale.map((value) => value.feedHash);
      const crossbarPrices = await handleFetchCrossbarPrices(feedHashes, mintMap);

      for (const {
        data: { oracleKey, timestamp },
        feedHash,
      } of swbPullOraclesStale) {
        const crossbarPrice = crossbarPrices.get(feedHash);
        if (!crossbarPrice) {
          throw new Error(`Crossbar didn't return data for ${feedHash}`);
        }
        let updatedOraclePrice = { ...crossbarPrice, timestamp } as OraclePrice;

        if (updatedOraclePrice.priceRealtime.price.isNaN()) {
          updatedOraclePrice = {
            ...updatedOraclePrice,
            priceRealtime: {
              ...updatedOraclePrice.priceRealtime,
              price: new BigNumber(0),
            },
          };
        }
        updatedOraclePrices.set(oracleKey, updatedOraclePrice);
      }
    }

    const updatedOraclePricesSorted = requestedOraclesData.map((value) => updatedOraclePrices.get(value.oracleKey)!);

    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=59");
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
    const payload: CrossbarSimulatePayload = [];

    const { payload: mainPayload, brokenFeeds: mainBrokenFeeds } = await fetchCrossbarPrices(
      feedHashes,
      SWITCHBOARD_CROSSSBAR_API
    );
    payload.push(...mainPayload);

    if (!mainBrokenFeeds.length) {
      return crossbarPayloadToOraclePricePerFeedHash(payload);
    }

    if (process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK) {
      // fallback crossbar
      const { payload: fallbackPayload, brokenFeeds: fallbackBrokenFeeds } = await fetchCrossbarPrices(
        mainBrokenFeeds,
        process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK
      );

      payload.push(...fallbackPayload);

      if (!fallbackBrokenFeeds.length) {
        return crossbarPayloadToOraclePricePerFeedHash(payload);
      }
    }

    // birdeye as last resort
    const birdeyePayload = await fetchBirdeyePrices(feedHashes, mintMap);

    console.log("birdeyePayload", birdeyePayload);

    payload.push(...birdeyePayload);

    return crossbarPayloadToOraclePricePerFeedHash(payload);
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Couldn't fetch from crossbar");
  }
}

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

async function fetchBirdeyePrices(
  feedHashes: string[],
  mintMap: Map<string, PublicKey>
): Promise<CrossbarSimulatePayload> {
  // TODO: implement
  try {
    const tokens = feedHashes.map((feedHash) => mintMap.get(feedHash)!.toBase58());

    const response = await fetch(`/api/birdeye/multiPrice?tokens=${tokens.join(",")}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch oracle prices");
    }

    const responseBody = (await response.json()) as BirdeyePriceResponse;

    const priceData = responseBody.data;

    const finalPayload: CrossbarSimulatePayload = feedHashes.map((feedHash) => {
      const tokenAddress = mintMap.get(feedHash)!.toBase58();
      const price = priceData[tokenAddress];
      return {
        feedHash,
        results: [price.value],
      };
    });

    return finalPayload;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Couldn't fetch from birdeye");
  }
}

async function fetchCrossbarPrices(
  feedHashes: string[],
  endpoint: string,
  username?: string,
  bearer?: string
): Promise<{ payload: CrossbarSimulatePayload; brokenFeeds: string[] }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 8000);

  const isAuth = username && bearer;

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

    const payload = (await response.json()) as CrossbarSimulatePayload;

    const brokenFeeds = payload.filter((feed) => feed.results[0] === null).map((feed) => feed.feedHash);

    return { payload, brokenFeeds };
  } catch (error) {
    console.error("Error:", error);
    return { payload: [], brokenFeeds: feedHashes };
  }
}

function crossbarPayloadToOraclePricePerFeedHash(payload: CrossbarSimulatePayload): Map<string, OraclePrice> {
  const oraclePrices: Map<string, OraclePrice> = new Map();
  for (const feedResponse of payload) {
    const oraclePrice = crossbarFeedResultToOraclePrice(feedResponse);
    oraclePrices.set(feedResponse.feedHash, oraclePrice);
  }
  return oraclePrices;
}

function crossbarFeedResultToOraclePrice(feedResponse: FeedResponse): OraclePrice {
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
