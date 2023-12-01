import React from "react";

import { useMrgnlendStore } from "~/store";
import { numeralFormatter } from "@mrgnlabs/mrgn-common";
import { usdFormatter, usdFormatterDyn } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { IconInfoCircle } from "~/components/ui/icons";
import { UserStats } from "./UserStats";
import { AssetCard } from "./AssetCard";

export const Portfolio = () => {
  const [isStoreInitialized, sortedBanks, accountSummary] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfos,
    state.accountSummary,
  ]);

  const lendingBanks = React.useMemo(
    () =>
      sortedBanks && isStoreInitialized
        ? sortedBanks
            .filter((b) => b.info.rawBank.config.assetWeightInit.toNumber() > 0)
            .filter((b) => b.isActive && b.position.isLending)
            .sort(
              (a, b) =>
                b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
            )
        : [],
    [sortedBanks, isStoreInitialized]
  ) as ActiveBankInfo[];

  const borrowingBanks = React.useMemo(
    () =>
      sortedBanks && isStoreInitialized
        ? sortedBanks
            .filter((b) => b.info.rawBank.config.assetWeightInit.toNumber() > 0)
            .filter((b) => b.isActive && !b.position.isLending)
            .sort(
              (a, b) =>
                b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
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
    [accountSummary.lendingAmountUnbiased]
  );
  const accountBorrowed = React.useMemo(
    () =>
      accountSummary
        ? Math.round(accountSummary.borrowingAmountUnbiased) > 10000
          ? usdFormatterDyn.format(Math.round(accountSummary.borrowingAmountUnbiased))
          : usdFormatter.format(accountSummary.borrowingAmountUnbiased)
        : "-",
    [accountSummary.borrowingAmountUnbiased]
  );
  const accountNetValue = React.useMemo(
    () =>
      accountSummary
        ? Math.round(accountSummary.balanceUnbiased) > 10000
          ? usdFormatterDyn.format(Math.round(accountSummary.balanceUnbiased))
          : usdFormatter.format(accountSummary.balanceUnbiased)
        : "-",
    [accountSummary.balanceUnbiased]
  );
  // TODO
  const accountInterest = React.useMemo(() => (12 > 10000 ? usdFormatterDyn.format(12) : usdFormatter.format(12)), []);

  const healthColor = React.useMemo(() => {
    if (accountSummary.healthFactor) {
      let color;

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
  return (
    <div className="bg-background-gray-dark p-6 rounded-xl space-y-3 w-full my-10">
      <h2 className="font-medium text-3xl">Portfolio</h2>
      <div className="text-muted-foreground">
        <dl className="flex justify-between items-center gap-2">
          <dt className="flex items-center gap-1.5 text-sm">
            Health factor <IconInfoCircle size={16} />
          </dt>
          <dd className="text-2xl font-bold" style={{ color: healthColor }}>
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
        <UserStats
          supplied={accountSupplied}
          borrowed={accountBorrowed}
          netValue={accountNetValue}
          interest={accountInterest}
        />
      </div>
      <div className="flex justify-between gap-20">
        <div className="flex flex-col flex-1 gap-4">
          <dl className="flex justify-between items-center gap-2 ">
            <dt className="text-xl font-medium">Supplied</dt>
            <dt className="text-muted-foreground">{accountSupplied}</dt>
          </dl>
          {isStoreInitialized ? (
            lendingBanks.length > 0 ? (
              <div className="flex flex-col gap-4">
                {lendingBanks.map((bank) => (
                  <AssetCard key={bank.meta.tokenSymbol} bank={bank} isInLendingMode={true} />
                ))}
              </div>
            ) : (
              <div color="#868E95" className="font-aeonik font-[300] text-sm flex gap-1">
                No lending positions found.
              </div>
            )
          ) : (
            <></>
            // <Skeleton sx={{ bgcolor: "grey.900" }} variant="rounded" width={390} height={215} />
          )}
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <dl className="flex justify-between items-center gap-2">
            <dt className="text-xl font-medium">Borrowed</dt>
            <dt className="text-muted-foreground">{accountBorrowed}</dt>
          </dl>
          {isStoreInitialized ? (
            borrowingBanks.length > 0 ? (
              <div className="flex flex-col gap-4">
                {borrowingBanks.map((bank) => (
                  <AssetCard key={bank.meta.tokenSymbol} bank={bank} isInLendingMode={false} />
                ))}
              </div>
            ) : (
              <div color="#868E95" className="font-aeonik font-[300] text-sm flex gap-1">
                No borrow positions found.
              </div>
            )
          ) : (
            <></>
            // <Skeleton sx={{ bgcolor: "grey.900" }} variant="rounded" width={390} height={215} />
          )}
        </div>
      </div>
    </div>
  );
};
