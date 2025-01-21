import React from "react";

import Link from "next/link";

import { IconAlertTriangle, IconArrowRight, IconInfoCircle } from "@tabler/icons-react";
import {
  numeralFormatter,
  percentFormatter,
  usdFormatter,
  USDC_MINT,
  tokenPriceFormatter,
} from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  cn,
  capture,
  getAssetPriceData,
  getBankCapData,
  getDepositsData,
  getRateData,
  getAssetWeightData,
  getUtilizationData,
  useConnection,
} from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2, useUiStore } from "~/store";

import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ActionBox, ActionBoxProvider } from "@mrgnlabs/mrgn-ui";

import { ArenaBank, ArenaPoolV2, ArenaPoolV2Extended, GroupStatus } from "~/types/trade-store.types";
import { useExtendedPool } from "~/hooks/useExtendedPools";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { useWallet } from "~/components/wallet-v2/hooks";

type AdminPoolDetailCardProps = {
  activePool: ArenaPoolV2;
};

export const AdminPoolDetailCard = ({ activePool }: AdminPoolDetailCardProps) => {
  const extendedPool = useExtendedPool(activePool);

  return (
    <div key={activePool.groupPk.toBase58()} className="relative bg-background border rounded-xl mb-12 pt-5 pb-2 px-4">
      <Link
        href={`/trade/${activePool.groupPk.toBase58()}`}
        className="group bg-background border rounded-xl absolute -top-5 left-3.5 px-2 py-1.5 flex items-center gap-2 transition-colors hover:bg-accent"
      >
        <div className="flex items-center -space-x-2.5">
          <img
            src={extendedPool.tokenBank.meta.tokenLogoUri}
            alt={extendedPool.tokenBank.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full bg-background z-10"
          />
          <img
            src={extendedPool.quoteBank.meta.tokenLogoUri}
            alt={extendedPool.quoteBank.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full"
          />
        </div>
        <span>
          {extendedPool.tokenBank.meta.tokenSymbol}/{extendedPool.quoteBank.meta.tokenSymbol}
        </span>
        <div className="flex items-center gap-1 text-mrgn-green">
          <span>Trade</span>
          <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
      <div className="flex flex-wrap w-full mt-2 flex-row gap-4">
        <YieldItem
          pool={extendedPool}
          bank={extendedPool.tokenBank}
          isLPPosition={extendedPool.status === GroupStatus.LP}
          className="flex-1"
        />
        <YieldItem
          pool={extendedPool}
          bank={extendedPool.quoteBank}
          isLPPosition={extendedPool.status === GroupStatus.LP}
          className="flex-1"
        />
      </div>
    </div>
  );
};

const YieldItem = ({
  pool,
  bank,
  className,
  isLPPosition,
}: {
  pool: ArenaPoolV2Extended;
  bank: ArenaBank;
  className?: string;
  isLPPosition?: boolean;
}) => {
  const {
    assetPriceData,
    assetWeightLending,
    assetWeightBorrow,
    bankCapLending,
    bankCapBorrowing,
    bankDepositData,
    bankBorrowData,
    lendingRate,
    borrowingRate,
    utilization,
    originationFee,
    protocolFixedFeeApr,
  } = React.useMemo(() => {
    const assetPriceData = getAssetPriceData(bank);
    const assetWeightLending = getAssetWeightData(bank, true);
    const assetWeightBorrow = getAssetWeightData(bank, false);
    const bankCapLending = getBankCapData(bank, true, false);
    const bankCapBorrowing = getBankCapData(bank, false, false);
    const bankDepositData = getDepositsData(bank, true, false);
    const bankBorrowData = getDepositsData(bank, false, false);
    const lendingRate = getRateData(bank, true);
    const borrowingRate = getRateData(bank, false);
    const utilization = getUtilizationData(bank).utilization;
    const originationFee = bank.info.rawBank.config.interestRateConfig.protocolOriginationFee;
    const protocolFixedFeeApr = bank.info.rawBank.config.interestRateConfig.protocolFixedFeeApr;

    return {
      assetPriceData,
      assetWeightLending,
      assetWeightBorrow,
      bankCapLending,
      bankCapBorrowing,
      bankDepositData,
      bankBorrowData,
      lendingRate,
      borrowingRate,
      utilization,
      originationFee,
      protocolFixedFeeApr,
    };
  }, [bank]);

  const [nativeSolBalance, refreshGroup] = useTradeStoreV2((state) => [state.nativeSolBalance, state.refreshGroup]);
  const client = useMarginfiClient({ groupPk: pool.groupPk });
  const { accountSummary, wrappedAccount } = useWrappedAccount({
    client,
    groupPk: pool.groupPk,
    banks: [pool.tokenBank, pool.quoteBank],
  });
  const { wallet, connected } = useWallet();
  const { connection } = useConnection();

  const { setDisplaySettings } = useUiStore((state) => ({
    setDisplaySettings: state.setDisplaySettings,
  }));

  return (
    <div className={cn("items-center min-w-[300px] space-y-2 px-2 py-4", className)}>
      <div className="flex items-center  gap-2 h-[24px]">
        <img src={bank.meta.tokenLogoUri} alt={bank.meta.tokenSymbol} width={24} height={24} className="rounded-full" />
        {bank.meta.tokenSymbol}
      </div>
      <div className="bg-accent/50 rounded-xl p-4">
        <dl className="w-full grid grid-cols-2 text-sm text-muted-foreground gap-1">
          <dt>Oracle Price</dt>
          <dd className="text-right text-primary">
            {tokenPriceFormatter(assetPriceData.assetPrice)}

            {assetPriceData.assetPriceOffset > assetPriceData.assetPrice * 0.1 && (
              <div className="absolute top-[-8px] right-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="absolute text-xs">⚠️</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-2">
                        <h4 className="text-base">Wide oracle price bands</h4>
                        {`${bank.meta.tokenSymbol} price estimates is ${usdFormatter.format(
                          assetPriceData.price
                        )} ± ${assetPriceData.assetPriceOffset.toFixed(
                          2
                        )}, which is wide. Proceed with caution. marginfi prices assets at the bottom of confidence bands and liabilities at the top.`}
                        <br />
                        <a href="https://docs.marginfi.com">
                          <u>Learn more.</u>
                        </a>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </dd>
          <dt>Deposit/Borrow APY</dt>
          <dd className="text-right text-primary">
            <span className="text-mrgn-success">{percentFormatter.format(lendingRate.rateAPY)}</span>
            {" / "}
            <span className="text-mrgn-error">{percentFormatter.format(borrowingRate.rateAPY)}</span>
          </dd>
          <dt>Deposits</dt>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <dd className="text-right text-primary flex items-center gap-1 justify-end">
                  {numeralFormatter(bankDepositData.bankDeposits)} {bank.meta.tokenSymbol}
                  {bankDepositData.isBankHigh || bankDepositData.isBankFilled ? (
                    <IconAlertTriangle size={14} />
                  ) : (
                    <IconInfoCircle size={14} />
                  )}
                </dd>
              </TooltipTrigger>
              <TooltipContent className="text-left flex flex-col gap-2">
                {bankDepositData.isBankHigh && (
                  <div>{bankDepositData.isBankFilled ? "Limit Reached" : "Approaching Limit"}</div>
                )}

                <span>
                  {bankDepositData.symbol} {bankDepositData.isInLendingMode ? "deposits" : "borrows"} are at{" "}
                  {percentFormatter.format(bankDepositData.capacity)} capacity.
                </span>
                {!bankDepositData.isBankFilled && <span>Available: {numeralFormatter(bankDepositData.available)}</span>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <dt>Borrows</dt>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <dd className="text-right text-primary flex items-center gap-1 justify-end">
                  {numeralFormatter(bankCapBorrowing.bankCap)} {bank.meta.tokenSymbol}
                  {bankBorrowData.isBankHigh || bankBorrowData.isBankFilled ? (
                    <IconAlertTriangle size={14} />
                  ) : (
                    <IconInfoCircle size={14} />
                  )}
                </dd>
              </TooltipTrigger>
              <TooltipContent className="text-left flex flex-col gap-2">
                {bankBorrowData.isBankHigh && (
                  <div>{bankBorrowData.isBankFilled ? "Limit Reached" : "Approaching Limit"}</div>
                )}

                <span>
                  {bankBorrowData.symbol} {bankBorrowData.isInLendingMode ? "deposits" : "borrows"} are at{" "}
                  {percentFormatter.format(bankBorrowData.capacity)} capacity.
                </span>
                {!bankBorrowData.isBankFilled && <span>Available: {numeralFormatter(bankBorrowData.available)}</span>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <dt className="flex items-center gap-0.5">
            Weight
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle size={14} />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col items-start gap-1 text-left">
                    <h4 className="text-base">Weight</h4>
                    <span>
                      How much your assets count for collateral, relative to their USD value. The higher the weight, the
                      more collateral you can borrow against it.
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </dt>
          <dd className="text-right text-primary flex items-center gap-1 justify-end">
            {(assetWeightLending.assetWeight * 100).toFixed(0) + "%"}
          </dd>
          <dt className="flex items-center gap-0.5">
            LTV
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle size={14} />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col items-start gap-1 text-left">
                    <h4 className="text-base">LTV</h4>
                    <span>
                      How much you can borrow against your free collateral. The higher the LTV, the more you can borrow
                      against your free collateral.
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </dt>
          <dd className="text-right text-primary flex items-center gap-1 justify-end">
            {(assetWeightBorrow.assetWeight * 100).toFixed(0) + "%"}
          </dd>
          <dt className="flex items-center gap-0.5">
            Utilization
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle size={14} />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col items-start gap-1 text-left">
                    <h4 className="text-base">Pool utilization</h4>
                    <span>
                      What percentage of supplied tokens have been borrowed. This helps determine interest rates. This
                      is not based on the global pool limits, which can limit utilization.
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </dt>
          <dd className="text-right text-primary flex items-center gap-1 justify-end">
            {percentFormatter.format(utilization / 100)}
          </dd>

          <dt className="flex items-center gap-0.5">
            Origination Fee
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle size={14} />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col items-start gap-1 text-left">
                    <h4 className="text-base">Origination Fee</h4>
                    <span>
                      What percentage of supplied tokens have been borrowed. This helps determine interest rates. This
                      is not based on the global pool limits, which can limit utilization.
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </dt>
          <dd className="text-right text-primary flex items-center gap-1 justify-end">
            {percentFormatter.format(originationFee.toNumber() / 100)}
          </dd>

          <dt className="flex items-center gap-0.5">
            Protocol Fixed Fee
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle size={14} />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col items-start gap-1 text-left">
                    <h4 className="text-base">Origination Fee</h4>
                    <span>
                      What percentage of supplied tokens have been borrowed. This helps determine interest rates. This
                      is not based on the global pool limits, which can limit utilization.
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </dt>
          <dd className="text-right text-primary flex items-center gap-1 justify-end">
            {percentFormatter.format(protocolFixedFeeApr.toNumber() / 100)}
          </dd>
        </dl>
      </div>
      {bank.isActive && bank.position.isLending && isLPPosition && (
        <div className="text-sm mb-4">
          <span className="text-muted-foreground">Supplied</span>{" "}
          {usdFormatter.format(bank.position.amount * bank.info.oraclePrice.priceRealtime.price.toNumber())}
          {!bank.info.state.mint.equals(USDC_MINT) && (
            <span className="uppercase ml-1 text-muted-foreground">
              ({numeralFormatter(bank.position.amount)} {bank.meta.tokenSymbol})
            </span>
          )}
        </div>
      )}
      <ActionBoxProvider
        banks={[bank]}
        nativeSolBalance={nativeSolBalance}
        marginfiClient={client}
        selectedAccount={wrappedAccount}
        connected={connected}
        accountSummaryArg={accountSummary ?? undefined}
        showActionComplete={false}
        hidePoolStats={["type"]}
        setDisplaySettings={setDisplaySettings}
      >
        <div className="flex flex-col gap-2 md:flex-row">
          {bank.isActive && bank.position.isLending && wrappedAccount && (
            <ActionBox.Lend
              isDialog={true}
              useProvider={true}
              lendProps={{
                connected: connected,
                requestedLendType: ActionType.Withdraw,
                requestedBank: bank,
                showAvailableCollateral: false,
                captureEvent: () => {
                  capture("yield_withdraw_btn_click", {
                    group: pool.groupPk.toBase58(),
                    bank: bank.meta.tokenSymbol,
                  });
                },
                onComplete: () => {
                  refreshGroup({
                    groupPk: pool.groupPk,
                    banks: [pool.tokenBank.address, pool.quoteBank.address],
                    connection,
                    wallet,
                  });
                },
              }}
              dialogProps={{
                trigger: (
                  <Button
                    variant="outline"
                    onClick={() => {
                      capture("position_add_btn_click", {
                        group: pool.groupPk.toBase58(),
                        bank: bank.meta.tokenSymbol,
                      });
                    }}
                  >
                    Withdraw ${bank.meta.tokenSymbol}
                  </Button>
                ),
                title: `Withdraw ${bank.meta.tokenSymbol}`,
              }}
            />
          )}
          <ActionBox.Lend
            isDialog={true}
            useProvider={true}
            lendProps={{
              connected: connected,
              requestedLendType: ActionType.Deposit,
              requestedBank: bank,
              showAvailableCollateral: false,
              captureEvent: () => {
                capture("position_add_btn_click", {
                  group: pool.groupPk.toBase58(),
                  bank: bank.meta.tokenSymbol,
                });
              },
              onComplete: () => {
                refreshGroup({
                  groupPk: pool.groupPk,
                  banks: [pool.tokenBank.address, pool.quoteBank.address],
                  connection,
                  wallet,
                });
              },
            }}
            dialogProps={{
              trigger: (
                <Button
                  variant="outline"
                  className="gap-1 min-w-16"
                  onClick={() => {
                    capture("position_add_btn_click", {
                      group: pool.groupPk.toBase58(),
                      bank: bank.meta.tokenSymbol,
                    });
                  }}
                >
                  Supply {bank.meta.tokenSymbol}
                </Button>
              ),
              title: `Supply ${bank.meta.tokenSymbol}`,
            }}
          />
        </div>
      </ActionBoxProvider>
    </div>
  );
};
