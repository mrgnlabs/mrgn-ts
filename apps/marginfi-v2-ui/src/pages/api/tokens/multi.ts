import { NextApiRequest, NextApiResponse } from "next";
import { BankMetadata, loadBankMetadatas } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { getConfig } from "@mrgnlabs/marginfi-client-v2";

const BIRDEYE_API = "https://public-api.birdeye.so";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mintList } = req.query;
  if (!mintList) {
    res.status(400).json({ error: "No mintList provided" });
    return;
  }

  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  let bankMetadataCache: {
    [address: string]: BankMetadata;
  } = {};

  try {
    // load bank metadata
    bankMetadataCache = await loadBankMetadatas();

    // init MarginfiClient to get banks with emissions
    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE!);
    const bankAddresses = Object.keys(bankMetadataCache).map((address) => new PublicKey(address));

    const marginfiClient = await MarginfiClient.fetch(getConfig("production"), {} as any, connection, {
      preloadedBankAddresses: bankAddresses,
      readOnly: true,
    });

    // all supported tokens, banks / emissions mints
    const allTokens = [
      ...new Set([
        ...Object.values(bankMetadataCache).map((bank) => bank.tokenAddress),
        ...[...marginfiClient.banks.values()]
          .map((bank) => bank.emissionsMint.toBase58())
          .filter((mint) => mint !== PublicKey.default.toBase58()),
      ]),
    ];

    // filter out restricted tokens
    const requestedMints = (mintList as string).split(",");
    const supportedMints = requestedMints.filter((mint) => allTokens.includes(mint));
    const restrictedMints = requestedMints.filter((mint) => !allTokens.includes(mint));

    if (restrictedMints.length > 0) {
      console.log("Filtered out restricted tokens:", restrictedMints);
    }

    // if no supported tokens, return error
    if (supportedMints.length === 0) {
      res.status(400).json({
        error: "No supported tokens in request",
      });
      return;
    }

    // continue with birdeye API call only for supported tokens
    const response = await fetch(`${BIRDEYE_API}/defi/multi_price?list_address=${supportedMints.join(",")}`, {
      headers: {
        Accept: "application/json",
        "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Birdeye API error: ${response.status} ${response.statusText}`,
      });
    }
    const data = await response.json();

    // cache for 20 minutes
    res.setHeader("Cache-Control", "s-maxage=1200, stale-while-revalidate=300");
    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Error fetching data",
    });
  }
}
