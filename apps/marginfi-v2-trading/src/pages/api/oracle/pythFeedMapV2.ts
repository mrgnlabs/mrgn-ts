import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  Bank,
  BankRaw,
  buildFeedIdMap,
  MARGINFI_IDL,
  MarginfiIdlType,
  MarginfiProgram,
} from "@mrgnlabs/marginfi-client-v2";
import { chunkedGetRawMultipleAccountInfoOrdered, loadBankMetadatas, Wallet } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";
import config from "~/config/marginfi";
import { BANK_METADATA_MAP } from "~/config/trade";
import { PoolListApiResponse } from "~/types/api.types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let host = extractHost(req.headers.origin) || extractHost(req.headers.referer);

    if (!host) {
      return res.status(400).json({ error: "Invalid input: expected a valid host." });
    }

    const poolList: PoolListApiResponse[] = await fetch(`${host}/api/pool/list`).then((response) => response.json());

    const requestedTokenBanks = poolList.map((pool) => pool.base_bank.address);
    const requestedQuoteBanks = poolList.map((pool) => pool.quote_banks[0].address);

    const requestedBanks = [...requestedTokenBanks, ...requestedQuoteBanks];

    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");
    const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;
    const provider = new AnchorProvider(connection, {} as Wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const program = new Program(idl, provider) as any as MarginfiProgram;

    const banksAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, requestedBanks);
    let banksMap: { address: PublicKey; data: BankRaw }[] = banksAis.map((account, index) => ({
      address: new PublicKey(requestedBanks[index]),
      data: Bank.decodeBankRaw(account.data, program.idl),
    }));

    const feedIdMap = await buildFeedIdMap(
      banksMap.map((b) => b.data.config),
      connection
    );

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=119");
    return res.status(200).json(stringifyFeedIdMap(feedIdMap));
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}

function stringifyFeedIdMap(feedIdMap: Map<string, PublicKey>) {
  let feedIdMap2: Record<string, string> = {};
  feedIdMap.forEach((value, key) => {
    feedIdMap2[key] = value.toBase58();
  });
  return feedIdMap2;
}

function extractHost(referer: string | undefined): string | undefined {
  if (!referer) {
    return undefined;
  }
  const url = new URL(referer);
  return url.origin;
}
