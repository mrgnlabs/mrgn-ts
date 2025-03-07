import React from "react";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { ExtendedBankInfo, TokenAccountMap } from "@mrgnlabs/marginfi-v2-ui-state";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";

type UseActionAmountsProps = {
  amountRaw: string;
  nativeSolBalance: number;
  quoteBank: ExtendedBankInfo;
};

export function useActionAmounts({ amountRaw, quoteBank, nativeSolBalance }: UseActionAmountsProps) {
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);

  const walletAmount = React.useMemo(() => {
    if (quoteBank.info.state.mint?.equals(WSOL_MINT)) {
      return quoteBank.userInfo.tokenAccount.balance + nativeSolBalance;
    }
    return quoteBank.userInfo.tokenAccount.balance;
  }, [nativeSolBalance, quoteBank]);

  return {
    amount,
    debouncedAmount,
    maxAmount: walletAmount,
  };
}
