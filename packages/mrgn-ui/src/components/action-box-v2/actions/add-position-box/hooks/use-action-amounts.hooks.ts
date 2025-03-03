import React from "react";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { ExtendedBankInfo, TokenAccountMap } from "@mrgnlabs/marginfi-v2-ui-state";

type UseActionAmountsProps = {
  amountRaw: string;
  quoteBank: ExtendedBankInfo;
};

export function useActionAmounts({ amountRaw, quoteBank }: UseActionAmountsProps) {
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);

  // This should be updated to use the max amount of the quote token in the bank
  const maxAmount = React.useMemo(() => {
    return quoteBank.userInfo.tokenAccount.balance ?? 0;
  }, [quoteBank]);

  return {
    amount,
    debouncedAmount,
    maxAmount,
  };
}
