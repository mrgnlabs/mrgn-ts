import {
  Bank,
  MarginfiAccount,
  MarginfiAccountRaw,
  MarginfiAccountType,
  MarginfiProgram,
  OraclePrice,
  simulateAccountHealthCacheWithFallback,
} from "@mrgnlabs/marginfi-client-v2";
import { BankMetadataMap } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";

export const getMarginfiAccountAddresses = async (
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

export const getMarginfiAccountData = async (
  program: MarginfiProgram,
  marginfiAccountPk: PublicKey,
  bankMap: Map<string, Bank>,
  oraclePrices: Map<string, OraclePrice>,
  bankMetadataMap: BankMetadataMap
): Promise<MarginfiAccountType> => {
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
