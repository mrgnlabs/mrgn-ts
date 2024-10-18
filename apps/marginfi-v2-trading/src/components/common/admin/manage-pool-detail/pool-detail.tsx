import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconArrowRight, IconInfoCircle } from "@tabler/icons-react";
import {
  aprToApy,
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
  isBankOracleStale,
  getAssetPriceData,
  getBankCapData,
  getDepositsData,
  getPositionData,
  getRateData,
  getAssetWeightData,
  getUtilizationData,
} from "@mrgnlabs/mrgn-utils";

import { useTradeStore } from "~/store";
import { ArenaBank, GroupData } from "~/store/tradeStore";
import { getGroupPositionInfo } from "~/utils";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { getPriceWithConfidence, PriceBias } from "@mrgnlabs/marginfi-client-v2";

interface YieldCardProps {
  group: GroupData;
}

export const PoolDetailCard = ({ group }: YieldCardProps) => {
  const [portfolio] = useTradeStore((state) => [state.portfolio]);
  const positionInfo = React.useMemo(() => getGroupPositionInfo({ group }), [group]);
  const isLeveraged = React.useMemo(() => positionInfo === "LONG" || positionInfo === "SHORT", [positionInfo]);

  const collateralBank = group.pool.quoteTokens[0];

  const isLPPosition = React.useCallback(
    (bank: ArenaBank) => {
      if (!portfolio) return false;
      return portfolio.lpPositions.some((group) => group.groupPk.equals(bank.info.rawBank.group));
    },
    [portfolio]
  );

  return (
    <div
      key={group.client.group.address.toBase58()}
      className="relative bg-background border rounded-xl mb-12 pt-5 pb-2 px-4"
    >
      <Link
        href={`/trade/${group.client.group.address.toBase58()}`}
        className="group bg-background border rounded-xl absolute -top-5 left-3.5 px-2 py-1.5 flex items-center gap-2 transition-colors hover:bg-accent"
      >
        <div className="flex items-center -space-x-2.5">
          <Image
            src={group.pool.token.meta.tokenLogoUri}
            alt={group.pool.token.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full bg-background z-10"
          />
          <Image
            src={collateralBank.meta.tokenLogoUri}
            alt={collateralBank.meta.tokenSymbol}
            width={24}
            height={24}
            className="rounded-full"
          />
        </div>
        <span>
          {group.pool.token.meta.tokenSymbol}/{collateralBank.meta.tokenSymbol}
        </span>
        <div className="flex items-center gap-1 text-mrgn-green">
          <span>Trade</span>
          <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
      <div className="flex w-full flex-row gap-4">
        <YieldItem
          group={group}
          bank={group.pool.token}
          isLeveraged={isLeveraged}
          isLPPosition={isLPPosition(group.pool.token)}
          className="flex-1 pt-2 pb-4 border-b items-center"
        />
        <YieldItem
          group={group}
          bank={collateralBank}
          isLeveraged={isLeveraged}
          isLPPosition={isLPPosition(collateralBank)}
          className="flex-1 pt-4 pb-2 items-center"
        />
      </div>
    </div>
  );
};

const YieldItem = ({
  group,
  bank,
  className,
  isLeveraged,
  isLPPosition,
}: {
  group: GroupData;
  bank: ArenaBank;
  className?: string;
  isLeveraged?: boolean;
  isLPPosition?: boolean;
}) => {
  const {
    assetPriceData,
    assetWeightLending,
    assetWeightBorrow,
    bankCapLending,
    bankCapBorrowing,
    deposits,
    borrows,
    lendingRate,
    borrowingRate,
    utilization,
  } = React.useMemo(() => {
    const assetPriceData = getAssetPriceData(bank);
    const assetWeightLending = getAssetWeightData(bank, true);
    const assetWeightBorrow = getAssetWeightData(bank, false);
    const bankCapLending = getBankCapData(bank, true, false);
    const bankCapBorrowing = getBankCapData(bank, false, false);
    const deposits = getDepositsData(bank, true, false);
    const borrows = getDepositsData(bank, false, false);
    const lendingRate = getRateData(bank, true);
    const borrowingRate = getRateData(bank, false);
    const utilization = getUtilizationData(bank);

    return {
      assetPriceData,
      assetWeightLending,
      assetWeightBorrow,
      bankCapLending,
      bankCapBorrowing,
      deposits,
      borrows,
      lendingRate,
      borrowingRate,
      utilization,
    };
  }, [bank]);

  return (
    <div className={cn("items-center", className)}>
      <div className="flex items-center gap-2">
        <Image
          src={bank.meta.tokenLogoUri}
          alt={bank.meta.tokenSymbol}
          width={24}
          height={24}
          className="rounded-full"
        />
        {bank.meta.tokenSymbol}
      </div>
      {/* <div className="grid grid-cols-2 gap-2 my-6">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">Total Deposits</span>
          <span>
            {usdFormatter.format(bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber())}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">Lending Rate (APY)</span>
          <span className="text-mrgn-success">{percentFormatter.format(aprToApy(bank.info.state.lendingRate))}</span>
        </div>
      </div> */}
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
          <dd className="text-right text-primary">{numeralFormatter(deposits.bankDeposits)}</dd>
          <dt>Available</dt>
          <dd className="text-right text-primary">{numeralFormatter(borrows.bankDeposits)}</dd>
          <dt>Global limit</dt>
          <dd className="text-right text-primary">{numeralFormatter(bankCapLending.bankCap)}</dd>

          <dt>Price</dt>
          <dd className="text-right text-primary"></dd>
          {/* {groupData.pool.token.position.liquidationPrice && (
            <>
              <dt>Liquidation Price</dt>
              <dd className="text-right text-primary">
                {tokenPriceFormatter(groupData.pool.token.position.liquidationPrice)}
              </dd>
            </>
          )} */}
          <dt className="flex items-center gap-0.5">
            Health Factor{" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle size={14} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Health factors indicate how well-collateralized your account is. A value below 0% exposes you to
                    liquidation.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </dt>
          <dd className="text-right">{/* {percentFormatter.format(groupData.accountSummary.healthFactor)} */}</dd>
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
      <div className="flex flex-col gap-2 md:flex-row">
        {bank.isActive && !isLeveraged && bank.position.isLending && group.selectedAccount && (
          <ActionBoxDialog activeGroupArg={group} requestedBank={bank} requestedAction={ActionType.Withdraw}>
            <Button
              className="w-full bg-background border text-foreground hover:bg-accent"
              onClick={() => {
                capture("yield_withdraw_btn_click", {
                  group: group.client.group.address.toBase58(),
                  bank: bank.meta.tokenSymbol,
                });
              }}
            >
              Withdraw {bank.meta.tokenSymbol}
            </Button>
          </ActionBoxDialog>
        )}
        <ActionBoxDialog activeGroupArg={group} requestedBank={bank} requestedAction={ActionType.Deposit}>
          {isLeveraged ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                You cannot provide liquidity with an open trade.{" "}
                <Link
                  className="underline"
                  href={"https://docs.marginfi.com/the-arena#supply-liquidity-and-earn-yield"}
                  target="_blank"
                >
                  learn more
                </Link>
              </p>
              <Button disabled className="w-full bg-background border text-foreground hover:bg-accent">
                Supply {bank.meta.tokenSymbol}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full bg-background border text-foreground hover:bg-accent"
              onClick={() => {
                capture("yield_supply_btn_click", {
                  group: group.client.group.address.toBase58(),
                  bank: bank.meta.tokenSymbol,
                });
              }}
            >
              Supply {bank.meta.tokenSymbol}
            </Button>
          )}
        </ActionBoxDialog>
      </div>
    </div>
  );
};
