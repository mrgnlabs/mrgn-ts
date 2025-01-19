import { PublicKey } from "@solana/web3.js";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, computeAccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";

import { useTradeStoreV2 } from "~/store";

type UseWrappedAccountProps = {
  client: MarginfiClient | null;
  groupPk: PublicKey;
  banks: ExtendedBankInfo[];
};

export function useWrappedAccount({ client, groupPk, banks }: UseWrappedAccountProps) {
  const [marginfiAccountByGroupPk] = useTradeStoreV2((state) => [state.marginfiAccountByGroupPk]);

  if (!marginfiAccountByGroupPk) {
    return { wrappedAccount: null, accountSummary: null, marginfiAccount: null };
  }

  const marginfiAccount = marginfiAccountByGroupPk[groupPk.toBase58()];

  const wrappedAccount =
    client && marginfiAccount ? new MarginfiAccountWrapper(marginfiAccount.address, client, marginfiAccount) : null;

  const accountSummary = wrappedAccount ? computeAccountSummary(wrappedAccount, banks) : null;

  return { wrappedAccount, accountSummary };
}
