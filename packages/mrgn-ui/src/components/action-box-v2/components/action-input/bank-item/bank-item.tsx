import React from "react";

import { shortenAddress, usdFormatter, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, LendingModes } from "@mrgnlabs/mrgn-utils";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { EmodeTag, OracleSetup } from "@mrgnlabs/marginfi-client-v2";
import { IconEmodeSimple } from "~/components/ui/icons";

type BankItemProps = {
  bank: ExtendedBankInfo;
  showBalanceOverride: boolean;
  solPrice?: number;
  nativeSolBalance?: number;
  rate?: string;
  lendingMode?: LendingModes;
  isRepay?: boolean;
  showStakedAssetLabel?: boolean;
  highlightEmodeLabel?: boolean;
  available?: boolean;
};

export const BankItem = ({
  bank,
  nativeSolBalance = 0,
  solPrice,
  showBalanceOverride,
  rate,
  lendingMode,
  isRepay,
  showStakedAssetLabel,
  highlightEmodeLabel,
  available = true,
}: BankItemProps) => {
  const balance = React.useMemo(() => {
    const isWSOL = bank.info.state.mint?.equals ? bank.info.state.mint.equals(WSOL_MINT) : false;

    return isWSOL ? bank.userInfo.tokenAccount.balance + nativeSolBalance : bank.userInfo.tokenAccount.balance;
  }, [bank, nativeSolBalance]);

  const openPosition = React.useMemo(() => {
    return isRepay ? (bank.isActive ? bank.position.amount : 0) : bank.userInfo.maxWithdraw;
  }, [bank, isRepay]);

  const balancePrice = React.useMemo(() => {
    const isStakedWithPythPush = bank.info.rawBank.config.oracleSetup === OracleSetup.StakedWithPythPush;

    const price = isStakedWithPythPush ? (solPrice ?? 0) : bank.info.state.price;
    return price * balance > 0.000001
      ? usdFormatter.format(price * balance)
      : `$${(balance * bank.info.state.price).toExponential(2)}`;
  }, [bank, balance, solPrice]);

  const openPositionPrice = React.useMemo(
    () =>
      openPosition * bank.info.state.price > 0.000001
        ? usdFormatter.format(openPosition * bank.info.state.price)
        : `$${(openPosition * bank.info.state.price).toExponential(2)}`,
    [bank, openPosition]
  );

  const isStakedActivating = bank.info.rawBank.config.assetTag === 2 && !bank.meta.stakePool?.isActive;

  return (
    <>
      <div className={cn("flex items-center gap-3", isStakedActivating && "opacity-30")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bank.meta.tokenLogoUri} alt={bank.meta.tokenName} width={28} height={28} className="rounded-full" />
        <div>
          <div className="flex items-center">
            <p className="font-medium">{bank.meta.tokenSymbol}</p>
            {bank.info.state.hasEmode && <IconEmodeSimple size={18} className="ml-1" />}
            {!available && <span className="text-[11px] ml-1 font-light">(currently unavailable)</span>}
          </div>
          {bank.info.rawBank.config.assetTag !== 2 ? (
            <p
              className={cn(
                "text-xs font-normal",
                (lendingMode === LendingModes.LEND || isRepay) && "text-success",
                lendingMode === LendingModes.BORROW && !isRepay && "text-warning"
              )}
            >
              {rate}
            </p>
          ) : (
            bank.info.rawBank.config.assetTag === 2 && (
              <p className="text-xs font-normal text-muted-foreground">
                Validator: {shortenAddress(bank.meta.stakePool?.validatorVoteAccount?.toBase58() ?? "")}
              </p>
            )
          )}
        </div>
      </div>

      {((!isRepay && lendingMode && lendingMode === LendingModes.BORROW && balance > 0) || showBalanceOverride) && (
        <div className="space-y-0.5 text-right font-normal text-sm">
          <p>
            {dynamicNumeralFormatter(balance, { tokenPrice: bank.info.oraclePrice.priceRealtime.price.toNumber() })}
          </p>
          <p className="text-xs text-muted-foreground">{balancePrice}</p>
        </div>
      )}

      {isRepay && openPosition > 0 && (
        <div className="space-y-0.5 text-right font-normal text-sm">
          <p>
            {dynamicNumeralFormatter(openPosition, {
              tokenPrice: bank.info.oraclePrice.priceRealtime.price.toNumber(),
            })}
          </p>
          <p className="text-xs text-muted-foreground">{openPositionPrice}</p>
        </div>
      )}
    </>
  );
};
