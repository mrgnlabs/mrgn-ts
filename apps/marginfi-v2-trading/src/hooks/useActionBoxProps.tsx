import { PublicKey } from "@solana/web3.js";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useAccountSummary";
import { ArenaBank } from "~/store/tradeStoreV2";
import { DEFAULT_ACCOUNT_SUMMARY } from "@mrgnlabs/marginfi-v2-ui-state";

export function useActionBoxProps(groupPk: PublicKey, banks: ArenaBank[]) {
  const marginfiClient = useMarginfiClient({ groupPk });
  const { wrappedAccount, accountSummary } = useWrappedAccount({ client: marginfiClient, groupPk, banks });

  return { marginfiClient, wrappedAccount, accountSummary: accountSummary ?? DEFAULT_ACCOUNT_SUMMARY };
}
