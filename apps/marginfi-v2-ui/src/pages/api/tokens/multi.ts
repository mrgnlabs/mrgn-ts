import { NextResponse } from "next/server";
import {
  BankMetadata,
  loadBankMetadatas,
  chunkedGetRawMultipleAccountInfoOrdered,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Bank, BankRaw, MARGINFI_IDL, MarginfiIdlType, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";
import marginfiConfig from "~/config/marginfi";

const BIRDEYE_API = "https://public-api.birdeye.so";

export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  // Get query params from URL
  const url = new URL(req.url);
  const mintList = url.searchParams.get("mintList");

  if (!mintList) {
    return NextResponse.json({ error: "No mintList provided" }, { status: 400 });
  }

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
    const idl = {
      ...MARGINFI_IDL,
      address: marginfiConfig.mfiConfig.programId.toBase58(),
    } as unknown as MarginfiIdlType;

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
      return NextResponse.json(
        {
          error: "No supported tokens in request",
        },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          error: `Birdeye API error: ${response.status} ${response.statusText}`,
        },
        { status: response.status }
      );
    }
    const data = await response.json();

    // return with cache headers
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=0",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error fetching data",
      },
      { status: 500 }
    );
  }
}
