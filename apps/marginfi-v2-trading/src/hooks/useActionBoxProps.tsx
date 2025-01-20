import { PublicKey } from "@solana/web3.js";

import { DEFAULT_ACCOUNT_SUMMARY } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { ArenaBank } from "~/types/trade-store.types";

export function useActionBoxProps(groupPk: PublicKey, banks: ArenaBank[]) {
  const marginfiClient = useMarginfiClient({ groupPk });
  const { wrappedAccount, accountSummary } = useWrappedAccount({ client: marginfiClient, groupPk, banks });

  return { marginfiClient, wrappedAccount, accountSummary: accountSummary ?? DEFAULT_ACCOUNT_SUMMARY };
}
