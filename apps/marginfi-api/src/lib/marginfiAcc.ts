import { MarginfiAccountRaw, MarginfiConfig, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";

export interface MarginfiAccountObjectMap {
  [key: string]: { key: string; account: MarginfiAccountRaw }[];
}

export type MarginfiAccountObject = { key: string; account: MarginfiAccountRaw };

export async function fetchMarginfiAccounts(
  program: MarginfiProgram,
  config: MarginfiConfig,
  address: string
): Promise<MarginfiAccountObject[]> {
  return (
    await program.account.marginfiAccount.all([
      {
        memcmp: {
          bytes: config.groupPk.toBase58(),
          offset: 8, // marginfiGroup is the first field in the account, so only offset is the discriminant
        },
      },
      {
        memcmp: {
          bytes: address,
          offset: 8 + 32, // authority is the second field in the account after the authority, so offset by the discriminant and a pubkey
        },
      },
    ])
  ).map((a) => ({ key: a.publicKey.toBase58(), account: a.account as MarginfiAccountRaw }));
}
