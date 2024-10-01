import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  Bank,
  BankRaw,
  buildFeedIdMap,
  MARGINFI_IDL,
  MarginfiIdlType,
  MarginfiProgram,
} from "@mrgnlabs/marginfi-client-v2";
import { chunkedGetRawMultipleAccountInfoOrdered, Wallet } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";
import config from "~/config/marginfi";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const connection = new Connection(
      process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || ""
    );
    const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;
    const provider = new AnchorProvider(connection, {} as Wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const program = new Program(idl, provider) as any as MarginfiProgram;

    let bankAddresses = (
      await connection.getProgramAccounts(config.mfiConfig.programId, {
        filters: [{ memcmp: { offset: 8 + 32 + 1, bytes: config.mfiConfig.groupPk.toBase58() } }],
        dataSlice: { length: 0, offset: 0 },
      })
    ).map((bank) => bank.pubkey.toBase58());

    const banksAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, bankAddresses);
    let banksMap: { address: PublicKey; data: BankRaw }[] = banksAis.map((account, index) => ({
      address: new PublicKey(bankAddresses[index]),
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
