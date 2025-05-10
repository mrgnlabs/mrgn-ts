import { NextApiRequest, NextApiResponse } from "next";
import {
  BankMetadata,
  loadBankMetadatas,
  chunkedGetRawMultipleAccountInfoOrdered,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Bank, BankRaw, MARGINFI_IDL, MarginfiIdlType, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";
import config from "~/config/marginfi";

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

    // fetch mfi banks to get emissions mints
    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");
    const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;

    const provider = new AnchorProvider(connection, {} as Wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const program = new Program(idl, provider) as any as MarginfiProgram;

    const bankAddresses = Object.keys(bankMetadataCache);

    const banksAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, bankAddresses);
    let banksMap: { address: PublicKey; data: BankRaw }[] = banksAis.map((account, index) => ({
      address: new PublicKey(bankAddresses[index]),
      data: Bank.decodeBankRaw(account.data, program.idl),
    }));

    // all supported tokens, banks / emissions mints
    const allTokens = [
      ...new Set([
        ...Object.values(bankMetadataCache).map((bank) => bank.tokenAddress),
        ...banksMap
          .map((bank) => bank.data.emissionsMint.toBase58())
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

    if (!data || !data.data) {
      console.log("data not found");
      return res.status(404).json({
        error: "Birdeye API error: data not found",
      });
    }

    // cache for 20 minutes (1200 seconds)
    res.setHeader("Cache-Control", "s-maxage=1200, stale-while-revalidate=300");
    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Error fetching data",
    });
  }
}
