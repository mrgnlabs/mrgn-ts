import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { IconInfoCircle } from "@tabler/icons-react";

import { numeralFormatter } from "@mrgnlabs/mrgn-common";
import { usdFormatter, usdFormatterDyn } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes } from "@mrgnlabs/mrgn-utils";

import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";

import { PortfolioUserStats, PortfolioAssetCard, PortfolioAssetCardSkeleton } from "~/components/common/Portfolio";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { WalletButton } from "~/components/wallet-v2";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { Loader } from "~/components/ui/loader";

export const LendingPortfolio = () => {
  const router = useRouter();
  const { connected } = useWallet();
  // State to track if the wallet just connected, used to handle store refresh
  const [walletConnectionDelay, setWalletConnectionDelay] = React.useState(false);

  const [isStoreInitialized, sortedBanks, accountSummary, isRefreshingStore] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfos,
    state.accountSummary,
    state.isRefreshingStore,
  ]);

  const [setLendingMode] = useUiStore((state) => [state.setLendingMode]);

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

  useEffect(() => {
    if (connected) {
      setWalletConnectionDelay(true);
      const timer = setTimeout(() => {
        setWalletConnectionDelay(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [connected]);

  useEffect(() => {
    console.log(accountSummary);
  }, [accountSummary]);

  if (isStoreInitialized && !connected) {
    return <WalletButton />;
  }

  if (
    (!isStoreInitialized ||
      walletConnectionDelay ||
      isRefreshingStore ||
      (!isStoreInitialized && accountSummary.balance === 0)) &&
    !lendingBanks.length &&
    !borrowingBanks.length
  ) {
    return <Loader label={connected ? "Loading positions" : "Loading"} />;
  }

  if (isStoreInitialized && connected) {
    if (!lendingBanks.length && !borrowingBanks.length) {
      return (
        <p className="text-center mt-4 text-muted-foreground">
          You do not have any open positions.
          <br className="md:hidden" />{" "}
          <Link href="/" className="border-b border-muted-foreground transition-colors hover:border-transparent">
            Explore the pools
          </Link>{" "}
          and make your first deposit!
        </p>
      );
    }

    return (
      <div className="p-4 md:p-6 rounded-xl space-y-3 w-full mb-10  bg-background-gray-dark">
        <h2 className="font-medium text-xl">Lend/borrow</h2>
        <div className="text-muted-foreground">
          <dl className="flex justify-between items-center gap-2">
            <dt className="flex items-center gap-1.5 text-sm">
              Lend/borrow health factor
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
          <div className="h-2 bg-background-gray-light rounded-full">
            <div
              className="h-2 rounded-full"
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
                  No borrow positions found.{" "}
                  <button
                    className="border-b border-primary/50 transition-colors hover:border-primary"
                    onClick={() => {
                      setLendingMode(LendingModes.BORROW);
                      router.push("/");
                    }}
                  >
                    Search the pools
                  </button>{" "}
                  and open a new borrow.
                </div>
              )
            ) : (
              <PortfolioAssetCardSkeleton />
            )}
          </div>
        </div>
      </div>
    );
  }
};
