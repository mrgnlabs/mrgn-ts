import React from "react";

import { WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { ArenaPoolV2Extended } from "~/types/trade-store.types";
import { PublicKey } from "@solana/web3.js";

export function useActionAmounts({
  amountRaw,
  activePool,
  selectedBankPk,
  nativeSolBalance,
}: {
  amountRaw: string;
  activePool: ArenaPoolV2Extended | null;
  selectedBankPk: PublicKey | null;
  nativeSolBalance: number;
}) {
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const bank = React.useMemo(() => {
    if (!selectedBankPk) return null;
    return [activePool?.tokenBank, activePool?.quoteBank].find((bank) => bank?.address.equals(selectedBankPk));
  }, [selectedBankPk, activePool]);

  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);

  const walletAmount = React.useMemo(
    () =>
      bank?.info.state.mint?.equals && bank?.info.state.mint?.equals(WSOL_MINT)
        ? bank?.userInfo.tokenAccount.balance + nativeSolBalance
        : bank?.userInfo.tokenAccount.balance,
    [nativeSolBalance, bank]
  );

  const maxAmount = React.useMemo(() => {
    if (!bank) {
      return 0;
    }

    return bank.userInfo.maxDeposit;
  }, [bank]);

  return {
    amount,
    debouncedAmount,
    walletAmount,
    maxAmount,
  };
}
