import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Bank, BankRaw, MARGINFI_IDL, MarginfiIdlType, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";

import {
  chunkedGetRawMultipleAccountInfoOrdered,
  nativeToUi,
  Wallet,
  wrappedI80F48toBigNumber,
} from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";
import config from "~/config/marginfi";
import { TRADE_GROUPS_MAP } from "~/config/trade";

const S_MAXAGE_TIME = 100;
const STALE_WHILE_REVALIDATE_TIME = 150;

type TradeGroupsCache = {
  [group: string]: [string, string];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");
    const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;

    const provider = new AnchorProvider(connection, {} as Wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const program = new Program(idl, provider) as any as MarginfiProgram;

    const groupsCache = (await fetch(TRADE_GROUPS_MAP)).json() as any as TradeGroupsCache;

    const bankAddresses = Object.values(groupsCache).flat();
    const banksAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, bankAddresses);
    let banksMap: { address: PublicKey; data: BankRaw }[] = banksAis.map((account, index) => ({
      address: new PublicKey(bankAddresses[index]),
      data: Bank.decodeBankRaw(account.data, program.idl),
    }));

    const groupSummaries = Object.entries(groupsCache).reduce(
      (acc, [groupPk, bankAddresses]) => {
        const tokenBankAddress = bankAddresses[0];
        const quoteBankAddress = bankAddresses[1];

        const tokenBank = banksMap.find((b) => b.address.toBase58() === tokenBankAddress);
        const quoteBank = banksMap.find((b) => b.address.toBase58() === quoteBankAddress);

        if (!tokenBank || !quoteBank) {
          throw new Error(`Bank not found for group ${groupPk}`);
        }

        const tokenBankSummary = formatBankSummary(tokenBank.data, tokenBankAddress);
        const quoteBankSummary = formatBankSummary(quoteBank.data, quoteBankAddress);

        acc[groupPk] = {
          tokenBankSummary,
          quoteBankSummary,
        };

        return acc;
      },
      {} as Record<
        string,
        {
          tokenBankSummary: BankSummary;
          quoteBankSummary: BankSummary;
        }
      >
    );

    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);
    return res.status(200).json(groupSummaries);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}

interface BankSummary {
  bankPk: string;
  mint: string;
  totalDeposits: number;
  totalBorrows: number;
  availableLiquidity: number;
}

const formatBankSummary = (bank: BankRaw, bankPk: string) => {
  const totalAssetShares = wrappedI80F48toBigNumber(bank.totalAssetShares);
  const totalLiabilityShares = wrappedI80F48toBigNumber(bank.totalLiabilityShares);
  const summary: BankSummary = {
    bankPk,
    mint: bank.mint.toBase58(),
    totalDeposits: nativeToUi(totalAssetShares, bank.mintDecimals),
    totalBorrows: nativeToUi(totalLiabilityShares, bank.mintDecimals),
    availableLiquidity: nativeToUi(totalAssetShares.minus(totalLiabilityShares), bank.mintDecimals),
  };
  return summary;
};
