import React from "react";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, computeAccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { useTradeStoreV2 } from "~/store";
import { PublicKey } from "@solana/web3.js";

type UseWrappedAccountProps = {
  client: MarginfiClient | null;
  groupPk: PublicKey;
  banks: ExtendedBankInfo[];
};

export function useWrappedAccount({ client, groupPk, banks }: UseWrappedAccountProps) {
  const [marginfiAccountByGroupPk] = useTradeStoreV2((state) => [state.marginfiAccountByGroupPk]);

  const marginfiAccount = React.useMemo(
    () => marginfiAccountByGroupPk[groupPk.toBase58()],
    [marginfiAccountByGroupPk, groupPk]
  );

  const wrappedAccount = React.useMemo(() => {
    if (!client || !marginfiAccount) return null;
    return new MarginfiAccountWrapper(marginfiAccount.address, client, marginfiAccount);
  }, [client, marginfiAccount]);

  const accountSummary = React.useMemo(() => {
    if (!wrappedAccount) return null;
    return computeAccountSummary(wrappedAccount, banks);
  }, [wrappedAccount, banks]);

  return { wrappedAccount, accountSummary };
}
