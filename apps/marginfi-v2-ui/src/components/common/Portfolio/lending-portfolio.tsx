import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { IconInfoCircle, IconUserPlus } from "@tabler/icons-react";

import { numeralFormatter } from "@mrgnlabs/mrgn-common";
import { usdFormatter, usdFormatterDyn } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes, MultiStepToastHandle, EMISSION_MINT_INFO_MAP } from "@mrgnlabs/mrgn-utils";

import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { WalletButton } from "~/components/wallet-v2";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { Loader } from "~/components/ui/loader";
import { RewardsDialog } from "./components/rewards";
import { IconLoader } from "~/components/ui/icons";

import { PortfolioAssetCard, PortfolioAssetCardSkeleton, PortfolioUserStats } from "./components";
import { rewardsType } from "./types";
import { useRewardSimulation } from "./hooks";
import { executeCollectTxn } from "./utils";
import { Select, SelectContent, SelectItem, SelectTrigger } from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { useWalletStore } from "~/components/wallet-v2/store/wallet.store";

export const LendingPortfolio = () => {
  const router = useRouter();
  const { connected } = useWallet();
  const [walletConnectionDelay, setWalletConnectionDelay] = React.useState(false);
  const [isAccountSelectOpen, setIsAccountSelectOpen] = React.useState(false);
  const [setIsWalletOpen] = useWalletStore((state) => [state.setIsWalletOpen]);

  const [
    isStoreInitialized,
    sortedBanks,
    accountSummary,
    isRefreshingStore,
    marginfiClient,
    selectedAccount,
    extendedBankInfos,
    marginfiAccounts,
    fetchMrgnlendState,
  ] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfos,
    state.accountSummary,
    state.isRefreshingStore,
    state.marginfiClient,
    state.selectedAccount,
    state.extendedBankInfos,
    state.marginfiAccounts,
    state.fetchMrgnlendState,
  ]);
  const [setLendingMode] = useUiStore((state) => [state.setLendingMode]);
  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData]);

  // Rewards
  const [rewards, setRewards] = React.useState<rewardsType | null>(null);
  const [rewardsDialogOpen, setRewardsDialogOpen] = React.useState(false);
  const [actionTxn, setActionTxn] = React.useState<VersionedTransaction | null>(null);
  const [rewardsLoading, setRewardsLoading] = React.useState(false);

  const { handleSimulation } = useRewardSimulation({
    simulationResult: rewards,
    actionTxn,
    marginfiClient,
    selectedAccount,
    extendedBankInfos,
    setSimulationResult: setRewards,
    setActionTxn,
    setErrorMessage: () => {},
  });

  React.useEffect(() => {
    handleSimulation();
  }, [actionTxn]);

  const handleCollectExectuion = React.useCallback(async () => {
    if (!marginfiClient || !actionTxn) return;
    await executeCollectTxn(marginfiClient, actionTxn, setRewardsLoading, setActionTxn, () => {
      setRewardsDialogOpen(false);
    });
  }, [marginfiClient, actionTxn]);

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

  const isLoading = React.useMemo(
    () =>
      (!isStoreInitialized ||
        walletConnectionDelay ||
        isRefreshingStore ||
        (!isStoreInitialized && accountSummary.balance === 0)) &&
      !lendingBanks.length &&
      !borrowingBanks.length,
    [isStoreInitialized, walletConnectionDelay, isRefreshingStore, accountSummary.balance, lendingBanks, borrowingBanks]
  );

  // Introduced this useEffect to show the loader for 2 seconds after wallet connection. This is to avoid the flickering of the loader, since the isRefreshingStore isnt set immediately after the wallet connection.
  React.useEffect(() => {
    if (connected) {
      setWalletConnectionDelay(true);
      const timer = setTimeout(() => {
        setWalletConnectionDelay(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [connected]);

  // Switching account logic
  const [isSwitchingAccount, setIsSwitchingAccount] = React.useState<boolean>(false);

  const hasMultipleAccount = React.useMemo(() => marginfiAccounts.length > 1, [marginfiAccounts]);

  const handleSwitchAccount = React.useCallback(
    async (value: PublicKey) => {
      if (selectedAccount?.address.toBase58() === value.toBase58()) return;
      setIsSwitchingAccount(true);
      const multiStepToast = new MultiStepToastHandle("Switching account", [{ label: "Fetching account data" }]);
      try {
        multiStepToast.start();
        const account = marginfiAccounts.find((account) => account.address.toBase58() === value.toBase58());
        if (!account) return;
        localStorage.setItem("mfiAccount", account.address.toBase58());
        await fetchMrgnlendState();
        multiStepToast.setSuccessAndNext();
      } catch (error) {
        console.error(error);
        multiStepToast.setFailed("Failed to switch account");
      } finally {
        setIsSwitchingAccount(false);
      }
    },
    [fetchMrgnlendState, marginfiAccounts, selectedAccount?.address]
  );

  if (isStoreInitialized && !connected) {
    return <WalletButton />;
  }

  if (isLoading) {
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
  }

  return (
    <div className="py-4 md:py-6 flex flex-col w-full mb-10 gap-2">
      <div className="px-4 md:px-6 flex items-center gap-1">
        {hasMultipleAccount && (
          <>
            <p>Current account:</p>
            <Select
              onValueChange={(value) => {
                handleSwitchAccount(new PublicKey(value));
              }}
              disabled={isSwitchingAccount}
              open={isAccountSelectOpen}
              onOpenChange={(open) => {
                setIsAccountSelectOpen(open);
              }}
              value={selectedAccount?.address.toBase58()}
            >
              <SelectTrigger className="w-max">
                Account{" "}
                {marginfiAccounts.findIndex(
                  (account) => account.address.toBase58() === selectedAccount?.address.toBase58()
                ) + 1}
              </SelectTrigger>
              <SelectContent>
                {marginfiAccounts.map((account, i) => (
                  <SelectItem key={i} value={account.address.toBase58()}>
                    Account {i + 1}
                  </SelectItem>
                ))}
                <Button
                  onClick={() => {
                    setIsWalletOpen(true);
                    setIsAccountSelectOpen(false);
                  }}
                  className="flex items-center mt-1 w-full font-light h-[32px] py-1.5 pl-2 pr-8 text-sm cursor-pointer hover:bg-background-gray-dark hover:text-primary"
                  variant="outline"
                >
                  <IconUserPlus size={16} />
                  Add account
                </Button>
              </SelectContent>
            </Select>
          </>
        )}
      </div>
      <div className="p-4 md:p-6 rounded-xl space-y-3 w-full bg-background-gray-dark">
        <div className="flex justify-between w-full">
          <h2 className="font-medium text-xl">Lend/borrow</h2>

          <div className="flex text-lg items-center gap-1.5 text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1">
                    <button className="cursor-default text-muted-foreground">No outstanding rewards</button>
                    <IconInfoCircle size={16} className="text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span>There are currently no banks that are outputting rewards.</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* {rewards && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1">
                      {rewards ? (
                        rewards.totalReward > 0 ? (
                          <button
                            className="cursor-pointer hover:text-[#AAA] underline"
                            onClick={() => {
                              setRewardsDialogOpen(true);
                            }}
                          >
                            Collect rewards
                          </button>
                        ) : (
                          <button className="cursor-default text-muted-foreground">No outstanding rewards</button>
                        )
                      ) : (
                        <span className="flex gap-1 items-center">
                          Calculating rewards <IconLoader size={16} />
                        </span>
                      )}
                      <IconInfoCircle size={16} className="text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>
                      {EMISSION_MINT_INFO_MAP.size === 0
                        ? "There are currently no banks that are outputting rewards."
                        : rewards && rewards.totalReward > 0
                        ? `You are earning rewards on the following banks: ${rewards.rewards
                            .map((r) => r.bank)
                            .join(", ")}`
                        : `You do not have any outstanding rewards. Deposit into a bank with emissions to earn additional rewards on top of yield. Banks with emissions: ${[
                            ...EMISSION_MINT_INFO_MAP.keys(),
                          ].join(", ")}`}
                    </span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )} */}
          </div>
        </div>
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
        <RewardsDialog
          availableRewards={rewards}
          onClose={() => {
            setRewardsDialogOpen(false);
          }}
          open={rewardsDialogOpen}
          onOpenChange={(open) => {
            setRewardsDialogOpen(open);
          }}
          onCollect={handleCollectExectuion}
          isLoading={rewardsLoading}
        />
      </div>
    </div>
  );
};
