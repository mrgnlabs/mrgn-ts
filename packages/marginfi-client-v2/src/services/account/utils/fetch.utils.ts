import { PublicKey } from "@solana/web3.js";

import { BankMetadataMap } from "@mrgnlabs/mrgn-common";

import { MarginfiAccount } from "~/models/account";
import { Bank } from "~/models/bank";
import { OraclePrice } from "~/services/price";
import { MarginfiProgram } from "~/types";

import { HealthCacheSimulationError, simulateAccountHealthCacheWithFallback } from "../account.service";
import { MarginfiAccountType, MarginfiAccountRaw } from "../types";

export const fetchMarginfiAccountAddresses = async (
  program: MarginfiProgram,
  authority: PublicKey,
  group: PublicKey
): Promise<PublicKey[]> => {
  const marginfiAccounts = (
    await program.account.marginfiAccount.all([
      {
        memcmp: {
          bytes: group.toBase58(),
          offset: 8, // marginfiGroup is the first field in the account, so only offset is the discriminant
        },
      },
      {
        memcmp: {
          bytes: authority.toBase58(),
          offset: 8 + 32, // authority is the second field in the account after the authority, so offset by the discriminant and a pubkey
        },
      },
    ])
  ).map((a) => a.publicKey);

  return marginfiAccounts;
};

export const fetchMarginfiAccountData = async (
  program: MarginfiProgram,
  marginfiAccountPk: PublicKey,
  bankMap: Map<string, Bank>,
  oraclePrices: Map<string, OraclePrice>,
  bankMetadataMap: BankMetadataMap
): Promise<{ marginfiAccount: MarginfiAccountType; error?: HealthCacheSimulationError }> => {
  const marginfiAccountRaw: MarginfiAccountRaw = await program.account.marginfiAccount.fetch(
    marginfiAccountPk,
    "confirmed"
  );
  const marginfiAccount = MarginfiAccount.fromAccountParsed(marginfiAccountPk, marginfiAccountRaw);

  const marginfiAccountWithCache = await simulateAccountHealthCacheWithFallback({
    program,
    marginfiAccount,
    bankMap,
    oraclePrices,
    bankMetadataMap,
    balances: marginfiAccount.balances,
  });

  return marginfiAccountWithCache;
};
