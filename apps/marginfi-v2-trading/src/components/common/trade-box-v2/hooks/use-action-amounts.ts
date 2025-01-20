import React from "react";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { TokenAccountMap } from "@mrgnlabs/marginfi-v2-ui-state";
import { ArenaPoolV2Extended } from "~/types/trade-store.types";

export function useActionAmounts({
  amountRaw,
  tokenAccountMap,
  activePoolExtended,
}: {
  amountRaw: string;
  tokenAccountMap: TokenAccountMap;
  activePoolExtended: ArenaPoolV2Extended;
}) {
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);

  // This should be updated to use the max amount of the quote token in the bank
  const maxAmount = React.useMemo(() => {
    return tokenAccountMap.get(activePoolExtended.quoteBank.info.rawBank.mint.toBase58())?.balance ?? 0;
  }, [tokenAccountMap, activePoolExtended]);

  return {
    amount,
    debouncedAmount,
    maxAmount,
  };
}
