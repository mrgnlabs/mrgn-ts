import React from "react";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { TokenAccountMap } from "@mrgnlabs/marginfi-v2-ui-state";
import { USDC_MINT } from "@mrgnlabs/mrgn-common";

export function useActionAmounts({
  amountRaw,
  tokenAccountMap,
}: {
  amountRaw: string;
  tokenAccountMap: TokenAccountMap;
}) {
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);

  const maxAmount = React.useMemo(() => {
    return tokenAccountMap.get(USDC_MINT.toBase58())?.balance ?? 0;
  }, [tokenAccountMap]); // TODO: update maxAmount depending on how much the user can deposit in the bank in the token. Then calculate USD value

  return {
    amount,
    debouncedAmount,
    maxAmount,
  };
}
