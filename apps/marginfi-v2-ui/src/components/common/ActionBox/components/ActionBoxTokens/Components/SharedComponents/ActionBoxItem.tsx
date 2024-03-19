import React from "react";

import Image from "next/image";

import { numeralFormatter, usdFormatter, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { cn, getTokenImageURL } from "~/utils";

type ActionBoxItemProps = {
  bank: ExtendedBankInfo;
  nativeSolBalance: number;
  showBalanceOverride: boolean;
  rate?: string;
  lendingMode?: LendingModes;
  isRepay?: boolean;
  available?: boolean;
};

export const ActionBoxItem = ({
  bank,
  nativeSolBalance,
  showBalanceOverride,
  rate,
  lendingMode,
  isRepay,
  available = true,
}: ActionBoxItemProps) => {
  const balance = React.useMemo(() => {
    const isWSOL = bank.info.state.mint?.equals ? bank.info.state.mint.equals(WSOL_MINT) : false;

    return isWSOL ? bank.userInfo.tokenAccount.balance + nativeSolBalance : bank.userInfo.tokenAccount.balance;
  }, [bank, nativeSolBalance]);

  const openPosition = React.useMemo(() => {
    return isRepay ? (bank.isActive ? bank.position.amount : 0) : bank.userInfo.maxWithdraw;
  }, [bank, isRepay]);

  const balancePrice = React.useMemo(
    () =>
      balance * bank.info.state.price > 0.01
        ? usdFormatter.format(balance * bank.info.state.price)
        : `$${(balance * bank.info.state.price).toExponential(2)}`,
    [bank, balance]
  );

  const openPositionPrice = React.useMemo(
    () =>
      openPosition * bank.info.state.price > 0.01
        ? usdFormatter.format(openPosition * bank.info.state.price)
        : `$${(openPosition * bank.info.state.price).toExponential(2)}`,
    [bank, openPosition]
  );

  return (
    <>
      <div className="flex items-center gap-3">
        <Image
          src={getTokenImageURL(bank.meta.tokenSymbol)}
          alt={bank.meta.tokenName}
          width={28}
          height={28}
          className="rounded-full"
        />
        <div>
          <p className="flex items-center">
            {bank.meta.tokenSymbol}
            {!available && <span className="text-[11px] ml-1 font-light">(currently unavailable)</span>}
          </p>
          {lendingMode && (
            <p
              className={cn(
                "text-xs font-normal",
                (lendingMode === LendingModes.LEND || isRepay) && "text-success",
                lendingMode === LendingModes.BORROW && !isRepay && "text-warning"
              )}
            >
              {rate}
            </p>
          )}
        </div>
      </div>

      {((!isRepay && lendingMode && lendingMode === LendingModes.BORROW && balance > 0) || showBalanceOverride) && (
        <div className="space-y-0.5 text-right font-normal text-sm">
          <p>{balance > 0.01 ? numeralFormatter(balance) : "< 0.01"}</p>
          <p className="text-xs text-muted-foreground">{balancePrice}</p>
        </div>
      )}

      {isRepay && openPosition > 0 && (
        <div className="space-y-0.5 text-right font-normal text-sm">
          <p>{openPosition > 0.01 ? numeralFormatter(openPosition) : "< 0.01"}</p>
          <p className="text-xs text-muted-foreground">{openPositionPrice}</p>
        </div>
      )}
    </>
  );
};
