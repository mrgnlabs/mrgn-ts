import React from "react";

import { numeralFormatter } from "@mrgnlabs/mrgn-common";
import { usdFormatter, usdFormatterDyn } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore, useUserProfileStore } from "~/store";

import { PortfolioUserStats, PortfolioAssetCard, PortfolioAssetCardSkeleton } from "~/components/common/Portfolio";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { IconInfoCircle } from "~/components/ui/icons";

export const Portfolio = () => {
  const [isStoreInitialized, sortedBanks, accountSummary] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfos,
    state.accountSummary,
  ]);

  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData]);

  const lendingBanks = React.useMemo(
    () =>
      sortedBanks && isStoreInitialized
        ? (sortedBanks.filter((b) => b.isActive && b.position.isLending) as ActiveBankInfo[]).sort(
            (a, b) => b.position.usdValue - a.position.usdValue
          )
        : [],
    [sortedBanks, isStoreInitialized]
  ) as ActiveBankInfo[];

  const borrowingBanks = React.useMemo(
    () =>
      sortedBanks && isStoreInitialized
        ? (sortedBanks.filter((b) => b.isActive && !b.position.isLending) as ActiveBankInfo[]).sort(
            (a, b) => b.position.usdValue - a.position.usdValue
          )
        : [],
    [sortedBanks, isStoreInitialized]
  ) as ActiveBankInfo[];

  const accountSupplied = React.useMemo(
    () =>
      accountSummary
        ? Math.round(accountSummary.lendingAmountUnbiased) > 10000
          ? usdFormatterDyn.format(Math.round(accountSummary.lendingAmountUnbiased))
          : usdFormatter.format(accountSummary.lendingAmountUnbiased)
        : "-",
    [accountSummary]
  );
  const accountBorrowed = React.useMemo(
    () =>
      accountSummary
        ? Math.round(accountSummary.borrowingAmountUnbiased) > 10000
          ? usdFormatterDyn.format(Math.round(accountSummary.borrowingAmountUnbiased))
          : usdFormatter.format(accountSummary.borrowingAmountUnbiased)
        : "-",
    [accountSummary]
  );
  const accountNetValue = React.useMemo(
    () =>
      accountSummary
        ? Math.round(accountSummary.balanceUnbiased) > 10000
          ? usdFormatterDyn.format(Math.round(accountSummary.balanceUnbiased))
          : usdFormatter.format(accountSummary.balanceUnbiased)
        : "-",
    [accountSummary]
  );

  const healthColor = React.useMemo(() => {
    if (accountSummary.healthFactor) {
      let color: string;

      if (accountSummary.healthFactor >= 0.5) {
        color = "#75BA80"; // green color " : "#",
      } else if (accountSummary.healthFactor >= 0.25) {
        color = "#B8B45F"; // yellow color
      } else {
        color = "#CF6F6F"; // red color
      }

      return color;
    } else {
      return "#fff";
    }
  }, [accountSummary.healthFactor]);

  if (!borrowingBanks.length && !lendingBanks.length) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 rounded-xl space-y-3 w-full mb-10">
      <h2 className="font-medium text-2xl md:text-3xl">Portfolio</h2>
      <div className="text-muted-foreground">
        <dl className="flex justify-between items-center gap-2">
          <dt className="flex items-center gap-1.5 text-sm">
            Health factor
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle size={16} />
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="flex flex-col gap-2 pb-2">
                    <p>
                      Health factor is based off <b>price biased</b> and <b>weighted</b> asset and liability values.
                    </p>
                    <div className="font-medium">
                      When your account health reaches 0% or below, you are exposed to liquidation.
                    </div>
                    <p>The formula is:</p>
                    <p className="text-sm italic text-center">{"(assets - liabilities) / (assets)"}</p>
                    <p>Your math is:</p>
                    <p className="text-sm italic text-center">{`(${usdFormatter.format(
                      accountSummary.lendingAmountWithBiasAndWeighted
                    )} - ${usdFormatter.format(
                      accountSummary.borrowingAmountWithBiasAndWeighted
                    )}) / (${usdFormatter.format(accountSummary.lendingAmountWithBiasAndWeighted)})`}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </dt>
          <dd className="text-xl md:text-2xl font-medium" style={{ color: healthColor }}>
            {numeralFormatter(accountSummary.healthFactor * 100)}%
          </dd>
        </dl>
        <div className="h-2 bg-background-gray-light">
          <div
            className="h-2"
            style={{
              backgroundColor: healthColor,
              width: `${accountSummary.healthFactor * 100}%`,
            }}
          />
        </div>
        <PortfolioUserStats
          supplied={accountSupplied}
          borrowed={accountBorrowed}
          netValue={accountNetValue}
          points={numeralFormatter(userPointsData.totalPoints)}
        />
      </div>
      <div className="flex flex-col md:flex-row justify-between flex-wrap gap-8 md:gap-20">
        <div className="flex flex-col flex-1 gap-4 md:min-w-[340px]">
          <dl className="flex justify-between items-center gap-2 ">
            <dt className="text-xl font-medium">Supplied</dt>
            <dt className="text-muted-foreground">{accountSupplied}</dt>
          </dl>
          {isStoreInitialized ? (
            lendingBanks.length > 0 ? (
              <div className="flex flex-col gap-4">
                {lendingBanks.map((bank) => (
                  <PortfolioAssetCard
                    key={bank.meta.tokenSymbol}
                    bank={bank}
                    isInLendingMode={true}
                    isBorrower={borrowingBanks.length > 0}
                  />
                ))}
              </div>
            ) : (
              <div color="#868E95" className="font-aeonik font-[300] text-sm flex gap-1">
                No lending positions found.
              </div>
            )
          ) : (
            <PortfolioAssetCardSkeleton />
          )}
        </div>
        <div className="flex flex-col flex-1 gap-4 md:min-w-[340px]">
          <dl className="flex justify-between items-center gap-2">
            <dt className="text-xl font-medium">Borrowed</dt>
            <dt className="text-muted-foreground">{accountBorrowed}</dt>
          </dl>
          {isStoreInitialized ? (
            borrowingBanks.length > 0 ? (
              <div className="flex flex-col gap-4">
                {borrowingBanks.map((bank) => (
                  <PortfolioAssetCard
                    key={bank.meta.tokenSymbol}
                    bank={bank}
                    isInLendingMode={false}
                    isBorrower={borrowingBanks.length > 0}
                  />
                ))}
              </div>
            ) : (
              <div color="#868E95" className="font-aeonik font-[300] text-sm flex gap-1">
                No borrow positions found.
              </div>
            )
          ) : (
            <PortfolioAssetCardSkeleton />
          )}
        </div>
      </div>
    </div>
  );
};
