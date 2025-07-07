import { PublicKey } from "@solana/web3.js";

import { DEFAULT_ACCOUNT_SUMMARY } from "@mrgnlabs/mrgn-state";

import { useArenaClient } from "~/hooks/useArenaClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { ArenaBank } from "~/types/trade-store.types";

export function useActionBoxProps(groupPk: PublicKey, banks: ArenaBank[]) {
  const marginfiClient = useArenaClient({ groupPk });
  const { wrappedAccount, accountSummary } = useWrappedAccount({ client: marginfiClient, groupPk, banks });

  return { marginfiClient, wrappedAccount, accountSummary: accountSummary ?? DEFAULT_ACCOUNT_SUMMARY };
}
