"use client";

import React from "react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

import {
  IconAlertCircle,
  IconChartAreaLine,
  IconDashboard,
  IconInfoCircle,
  IconSearch,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";

import { numeralFormatter, SolanaTransaction } from "@mrgnlabs/mrgn-common";
import { usdFormatter, usdFormatterDyn } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  cn,
  ExecuteActionProps,
  ExecuteCollectRewardsAction,
  usePrevious,
  useConnection,
  useAuth,
} from "@mrgnlabs/mrgn-utils";
import { CustomToastType, toastManager } from "@mrgnlabs/mrgn-toasts";
import { useWallet } from "@mrgnlabs/mrgn-ui";

import { useUiStore, useUserProfileStore } from "~/store";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { WalletAuthAccounts, WalletButton } from "~/components/wallet-v2";
import { Loader } from "~/components/ui/loader";

import { RewardsDialog } from "./components/rewards";

import {
  PortfolioAssetCard,
  PortfolioAssetCardSkeleton,
  PortfolioUserStats,
  PortfolioChart,
  InterestChart,
} from "./components";
import { RewardsType } from "./types";
import { useRewardSimulation } from "./hooks";
import { EmodePortfolio } from "~/components/common/emode/components";
import { useEmodeLineConnections } from "~/components/common/emode/hooks";
import { IconLoader, IconEmode } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import {
  useAccountSummary,
  useEmode,
  useExtendedBanks,
  useMarginfiAccountAddresses,
  useMarginfiClient,
  useRefreshUserData,
  useWrappedMarginfiAccount,
} from "@mrgnlabs/mrgn-state";

// Interest earned data types
interface InterestEarnedDataPoint {
  account_id: number;
  account_address: string;
  bank_id: number;
  bank_address: string;
  bank_mint: string;
  mint_decimals: number;
  bank_snapshot_time: string;
  account_balance_snapshot_time: string;
  account_balance_id: number;
  bank_name: string;
  bank_symbol: string;
  asset_shares_normalized: number;
  liability_shares_normalized: number;
  current_deposit_value: number;
  current_debt_value: number;
  initial_asset_share_value: number;
  initial_liability_share_value: number;
  current_price_usd_close: number;
  current_price_timestamp_close: string;
  initial_deposit_value: number;
  initial_debt_value: number;
  interest_earned: number;
  interest_paid: number;
  current_deposit_value_usd_close: number;
  current_debt_value_usd_close: number;
  initial_deposit_value_usd_close: number;
  initial_debt_value_usd_close: number;
  interest_earned_usd_close: number;
  interest_paid_usd_close: number;
  past_positions_interest_earned: number;
  past_positions_interest_paid: number;
  past_positions_interest_earned_usd_close: number;
  past_positions_interest_paid_usd_close: number;
  cumulative_interest_earned: number;
  cumulative_interest_paid: number;
  cumulative_interest_earned_usd_close: number;
  cumulative_interest_paid_usd_close: number;
}

interface ChartDataPoint {
  timestamp: string;
  [bankSymbol: string]: number | string;
}

interface InterestEarnedState {
  data: InterestEarnedDataPoint[];
  chartData: ChartDataPoint[];
  bankSymbols: string[];
  loading: boolean;
  error: string | null;
}

const initialRewardsState: RewardsType = {
  state: "NOT_FETCHED",
  tooltipContent: "Fetching rewards...",
  rewards: [],
  totalRewardAmount: 0,
};

const initialInterestEarnedState: InterestEarnedState = {
  data: [],
  chartData: [],
  bankSymbols: [],
  loading: false,
  error: null,
};

// Generic function to transform interest data (earned or paid)
const transformInterestData = (
  data: InterestEarnedDataPoint[],
  dataType: "earned" | "paid"
): { chartData: ChartDataPoint[]; bankSymbols: string[] } => {
  if (!data.length) return { chartData: [], bankSymbols: [] };

  const fieldName =
    dataType === "earned" ? "cumulative_interest_earned_usd_close" : "cumulative_interest_paid_usd_close";

  // Get unique bank symbols
  const allBankSymbols = Array.from(new Set(data.map((item) => item.bank_symbol)));

  // FIRST: Filter out banks with no meaningful interest BEFORE gap filling
  const activeBankSymbols = allBankSymbols.filter((bankSymbol) => {
    const bankData = data.filter((item) => item.bank_symbol === bankSymbol);
    const hasSignificantValue = bankData.some((item) => Math.abs(item[fieldName]) > 0.01);
    return hasSignificantValue;
  });

  // If no active banks, return empty
  if (activeBankSymbols.length === 0) {
    return { chartData: [], bankSymbols: [] };
  }

  // Generate array of all dates for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29); // 30 days total

  const allDates: string[] = [];
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    allDates.push(currentDate.toISOString().split("T")[0]); // YYYY-MM-DD format
  }

  // Group data by bank symbol (only for active banks)
  const dataByBank: Record<string, InterestEarnedDataPoint[]> = {};
  activeBankSymbols.forEach((symbol) => {
    dataByBank[symbol] = data
      .filter((item) => item.bank_symbol === symbol)
      .sort((a, b) => new Date(a.bank_snapshot_time).getTime() - new Date(b.bank_snapshot_time).getTime());
  });

  // Fill gaps for each active bank symbol
  const filledDataByBank: Record<string, Record<string, number>> = {};

  activeBankSymbols.forEach((bankSymbol) => {
    const bankData = dataByBank[bankSymbol];
    filledDataByBank[bankSymbol] = {};

    let lastKnownValue = 0;

    // For each date in our timeline
    allDates.forEach((dateStr) => {
      // Check if we have data for this date
      const existingData = bankData.find((item) => {
        const itemDate = new Date(item.bank_snapshot_time).toISOString().split("T")[0];
        return itemDate === dateStr;
      });

      if (existingData) {
        // Use actual data if available
        lastKnownValue = existingData[fieldName];
        filledDataByBank[bankSymbol][dateStr] = lastKnownValue;
      } else {
        // Fill gap with last known value (forward fill)
        // For cumulative interest, this makes sense as it should not decrease
        filledDataByBank[bankSymbol][dateStr] = lastKnownValue;
      }
    });

    // If we never found any data for this bank, try backfill from future data
    if (lastKnownValue === 0 && bankData.length > 0) {
      const firstDataValue = bankData[0][fieldName];
      allDates.forEach((dateStr) => {
        if (filledDataByBank[bankSymbol][dateStr] === 0) {
          filledDataByBank[bankSymbol][dateStr] = firstDataValue;
        }
      });
    }
  });

  // Convert filled data back to chart format (only include active banks)
  const chartData: ChartDataPoint[] = allDates.map((dateStr) => {
    const dataPoint: ChartDataPoint = {
      timestamp: `${dateStr}T12:00:00.000Z`, // Use noon to avoid timezone issues
    };

    activeBankSymbols.forEach((bankSymbol) => {
      dataPoint[bankSymbol] = filledDataByBank[bankSymbol][dateStr] || 0;
    });

    return dataPoint;
  });

  return { chartData, bankSymbols: activeBankSymbols };
};

// Convenience functions for specific data types
const transformInterestEarnedData = (data: InterestEarnedDataPoint[]) => transformInterestData(data, "earned");

const transformInterestPaidData = (data: InterestEarnedDataPoint[]) => transformInterestData(data, "paid");

export const LendingPortfolio = () => {
  const { connected, wallet, walletAddress } = useWallet();
  const { connection } = useConnection();
  const { user, isAuthenticating, authenticateUser } = useAuth();

  const [walletConnectionDelay, setWalletConnectionDelay] = React.useState(false);
  const { extendedBanks: sortedBanks } = useExtendedBanks(walletAddress);
  const accountSummary = useAccountSummary(walletAddress);
  const { marginfiClient } = useMarginfiClient(wallet);
  const { wrappedAccount: selectedAccount } = useWrappedMarginfiAccount(walletAddress, wallet);
  const { data: marginfiAccounts } = useMarginfiAccountAddresses(walletAddress);
  const { activeEmodePairs, emodePairs } = useEmode(walletAddress);
  const refreshUserData = useRefreshUserData();

  const isStoreInitialized = true;
  const isRefreshingStore = false;

  const [priorityFees, broadcastType, accountLabels, setGlobalActionBoxProps, globalActionBoxProps] = useUiStore(
    (state) => [
      state.priorityFees,
      state.broadcastType,
      state.accountLabels,
      state.setGlobalActionBoxProps,
      state.globalActionBoxProps,
    ]
  );
  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData]);

  const [filterEmode, setFilterEmode] = React.useState(false);
  const [openAccordions, setOpenAccordions] = React.useState<Record<string, boolean>>({});

  // Highlighted emode line indices for hover (array for multiple lines)
  const [hoveredPairIndices, setHoveredPairIndices] = React.useState<number[] | null>(null);
  const hoverDebounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Rewards
  const [rewardsState, setRewardsState] = React.useState<RewardsType>(initialRewardsState);
  const [rewardsDialogOpen, setRewardsDialogOpen] = React.useState(false);
  const [actionTxn, setActionTxn] = React.useState<SolanaTransaction | null>(null);
  const [rewardsLoading, setRewardsLoading] = React.useState(false);
  const [rewardsToastOpen, setRewardsToastOpen] = React.useState(false);
  const [rewardsToast, setRewardsToast] = React.useState<CustomToastType | null>(null);

  // Interest Earned State
  const [interestEarnedState, setInterestEarnedState] = React.useState<InterestEarnedState>(initialInterestEarnedState);

  const [interestPaidState, setInterestPaidState] = React.useState<InterestEarnedState>(initialInterestEarnedState);
  const hasMultipleAccount = React.useMemo(() => marginfiAccounts && marginfiAccounts.length > 1, [marginfiAccounts]);

  const { handleSimulation } = useRewardSimulation({
    simulationResult: rewardsState,
    marginfiClient,
    selectedAccount,
    extendedBankInfos: sortedBanks,
    setSimulationResult: setRewardsState,
    setErrorMessage: () => {}, // No error handling, should fail silently since it is on page load.
    setActionTxn,
  });

  // Authentication and interest earned logic
  const handleAuthAction = React.useCallback(async () => {
    if (!user) {
      // User not authenticated, authenticate them
      try {
        if (wallet && connection) {
          await authenticateUser(wallet, connection);
        }
      } catch (error) {
        console.error("Authentication failed:", error);
      }
    }
  }, [user, wallet, connection, authenticateUser]);

  // Fetch interest earned when user is authenticated
  React.useEffect(() => {
    const fetchInterestEarned = async () => {
      if (!user) return;

      setInterestEarnedState((prev) => ({ ...prev, loading: true, error: null }));
      setInterestPaidState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/user/interest-earned");

        if (response.status === 401) {
          setInterestEarnedState((prev) => ({
            ...prev,
            loading: false,
            error: "Authentication required",
          }));
          setInterestPaidState((prev) => ({
            ...prev,
            loading: false,
            error: "Authentication required",
          }));
          return;
        }

        const data = await response.json();

        if (response.ok) {
          // Transform data for both earned and paid interest
          const earnedData = transformInterestEarnedData(data);
          const paidData = transformInterestPaidData(data);

          setInterestEarnedState({
            data,
            chartData: earnedData.chartData,
            bankSymbols: earnedData.bankSymbols,
            loading: false,
            error: null,
          });

          setInterestPaidState({
            data,
            chartData: paidData.chartData,
            bankSymbols: paidData.bankSymbols,
            loading: false,
            error: null,
          });
        } else {
          console.error("Error fetching interest data:", data.error);
          setInterestEarnedState((prev) => ({
            ...prev,
            loading: false,
            error: data.error || "Failed to fetch interest data",
          }));
          setInterestPaidState((prev) => ({
            ...prev,
            loading: false,
            error: data.error || "Failed to fetch interest data",
          }));
        }
      } catch (error) {
        console.error("Error fetching interest data:", error);
        setInterestEarnedState((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to fetch interest data",
        }));
        setInterestPaidState((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to fetch interest data",
        }));
      }
    };

    fetchInterestEarned();
  }, [user]);

  ////////////////////////////
  // handleSimulation logic //
  ////////////////////////////
  const [shouldFetchRewards, setShouldFetchRewards] = React.useState(true);
  const prevSelectedAccount = usePrevious(selectedAccount);
  React.useEffect(() => {
    if (selectedAccount && prevSelectedAccount?.address.toBase58() !== selectedAccount.address.toBase58()) {
      setShouldFetchRewards(true);
    }
  }, [selectedAccount, prevSelectedAccount]);
  React.useEffect(() => {
    if (selectedAccount && marginfiClient?.banks && shouldFetchRewards) {
      setRewardsState(initialRewardsState);
      handleSimulation();
      setShouldFetchRewards(false);
    }
  }, [handleSimulation, marginfiClient, selectedAccount, shouldFetchRewards]);

  const handleCollectRewardsAction = React.useCallback(async () => {
    if (!marginfiClient || !actionTxn) return;
    const props: ExecuteActionProps = {
      marginfiClient,
      actionTxns: { transactions: [actionTxn] },
      attemptUuid: uuidv4(),
      processOpts: { ...priorityFees, broadcastType },
      txOpts: {},
      callbacks: {
        onComplete: () => {
          setRewardsState(initialRewardsState);
          handleSimulation();
        },
      },
    };

    ExecuteCollectRewardsAction(props);

    setRewardsDialogOpen(false);
  }, [marginfiClient, actionTxn, priorityFees, broadcastType, handleSimulation, setRewardsDialogOpen]);

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
        ? Math.round(accountSummary.lendingAmountEquity) > 10000
          ? usdFormatterDyn.format(Math.round(accountSummary.lendingAmountEquity))
          : usdFormatter.format(accountSummary.lendingAmountEquity)
        : "-",
    [accountSummary]
  );
  const accountBorrowed = React.useMemo(
    () =>
      accountSummary
        ? Math.round(accountSummary.borrowingAmountEquity) > 10000
          ? usdFormatterDyn.format(Math.round(accountSummary.borrowingAmountEquity))
          : usdFormatter.format(accountSummary.borrowingAmountEquity)
        : "-",
    [accountSummary]
  );
  const accountNetValue = React.useMemo(
    () =>
      accountSummary
        ? Math.round(accountSummary.balanceEquity) > 10000
          ? usdFormatterDyn.format(Math.round(accountSummary.balanceEquity))
          : usdFormatter.format(accountSummary.balanceEquity)
        : "-",
    [accountSummary]
  );

  const healthColor = React.useMemo(() => {
    if (accountSummary.healthFactor) {
      let color: string;

      if (accountSummary.healthSimFailed) {
        color = "#a1a1aa";
      } else if (accountSummary.healthFactor >= 0.5) {
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
  }, [accountSummary.healthFactor, accountSummary.healthSimFailed]);

  const isLoading = React.useMemo(
    () =>
      (!isStoreInitialized ||
        walletConnectionDelay ||
        isRefreshingStore ||
        (!isStoreInitialized && accountSummary.balanceEquity === 0)) &&
      !lendingBanks.length &&
      !borrowingBanks.length,
    [
      isStoreInitialized,
      walletConnectionDelay,
      isRefreshingStore,
      accountSummary.balanceEquity,
      lendingBanks,
      borrowingBanks,
    ]
  ); // Create refs for each lending and borrowing card, keyed by address
  const lendingRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const borrowingRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  // Build connection pairs: only connect assets in the same e-mode group
  // Also build a mapping from asset address to pair indices
  const { refPairs, assetToPairIndices } = React.useMemo(() => {
    if (!selectedAccount) return { refPairs: [], assetToPairIndices: {} };
    const pairs: [{ current: HTMLDivElement | null }, { current: HTMLDivElement | null }][] = [];
    const assetToPairIndices: Record<string, number[]> = {};
    let pairIdx = 0;
    activeEmodePairs.forEach((emodePair) => {
      lendingBanks
        .filter((bank) => bank.info.rawBank.emode.emodeTag === emodePair.collateralBankTag)
        .forEach((lendingBank) => {
          // Create ref objects that will be populated by the DOM elements
          // Don't check if refs exist yet - they'll be populated when elements render
          const lendingRefObj = {
            get current() {
              return lendingRefs.current[lendingBank.address.toBase58()] || null;
            },
          };
          const borrowingRefObj = {
            get current() {
              return borrowingRefs.current[emodePair.liabilityBank.toBase58()] || null;
            },
          };

          pairs.push([lendingRefObj, borrowingRefObj]);
          // Map both lending and borrowing asset addresses to this pair index
          const lendAddr = lendingBank.address.toBase58();
          const borrowAddr = emodePair.liabilityBank.toBase58();
          if (!assetToPairIndices[lendAddr]) assetToPairIndices[lendAddr] = [];
          if (!assetToPairIndices[borrowAddr]) assetToPairIndices[borrowAddr] = [];
          assetToPairIndices[lendAddr].push(pairIdx);
          assetToPairIndices[borrowAddr].push(pairIdx);
          pairIdx++;
        });
    });
    return { refPairs: pairs, assetToPairIndices };
  }, [selectedAccount, activeEmodePairs, lendingBanks]);

  // Use the hook
  const { containerRef, LineConnectionSvg } = useEmodeLineConnections(
    refPairs,
    {
      color: "rgba(147, 51, 234, 0.3)",
      pulseColor: "rgba(147, 51, 234, 0.8)",
      pulseSpeed: 3,
      cornerRadius: 10,
      lineSpacing: 40,
      useUniqueColors: false,
    },
    hoveredPairIndices ?? undefined
  );

  React.useEffect(() => {
    if (rewardsToastOpen || rewardsState.state !== "REWARDS_FETCHED" || rewardsState.totalRewardAmount === 0) return;

    if (rewardsToast) {
      rewardsToast.close();
    }

    const newToast = toastManager.showCustomToast(
      <div className="text-sm space-y-4">
        <p className="md:pr-16">You have rewards available for collection.</p>
        <Button
          size="sm"
          onClick={() => {
            setRewardsDialogOpen(true);
          }}
        >
          Click to collect
        </Button>
      </div>
    );

    setRewardsToastOpen(true);

    setRewardsToast(newToast);
  }, [rewardsState, rewardsToastOpen, rewardsToast]);

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

  // Close all accordions when filterEmode is turned on
  React.useEffect(() => {
    if (filterEmode) {
      setOpenAccordions({});
    }
  }, [filterEmode]);

  // Handle escape key to disable filterEmode
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && filterEmode) {
        setFilterEmode(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [filterEmode]);

  if (isStoreInitialized && !connected) {
    return <WalletButton />;
  }

  if (isLoading) {
    return <Loader label={connected ? "Loading portfolio" : "Loading"} />;
  }

  if (isStoreInitialized && connected && !hasMultipleAccount) {
    if (!lendingBanks.length && !borrowingBanks.length) {
      return (
        <div className="flex flex-col items-center justify-center gap-4">
          <p className="text-center mt-4 text-muted-foreground">
            You do not have any open positions.
            <br className="md:hidden" />{" "}
            <Link href="/" className="border-b border-muted-foreground transition-colors hover:border-transparent">
              Explore the pools
            </Link>{" "}
            and make your first deposit
            {hasMultipleAccount && " or select a different account from the dropdown below"}.
          </p>
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col items-center md:items-start w-full gap-4">
      {/* Auth Button - Simple proof of concept */}
      <div className="w-full flex justify-end mb-4">
        <Button onClick={handleAuthAction} disabled={isAuthenticating} variant={user ? "outline" : "default"} size="sm">
          {isAuthenticating ? "Authenticating..." : user ? "Logout" : "Login"}
        </Button>
      </div>

      <div className="pb-6 md:p-6 rounded-xl w-full space-y-8 md:bg-muted/25">
        <div className="transition-opacity duration-500">
          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground hidden md:block">Account</p>
              <WalletAuthAccounts
                mfiClient={marginfiClient}
                connection={marginfiClient?.provider.connection ?? null}
                marginfiAccounts={marginfiAccounts ?? []}
                selectedAccount={selectedAccount}
                fetchMrgnlendState={refreshUserData}
                closeOnSwitch={true}
                popoverContentAlign="start"
                processOpts={{
                  ...priorityFees,
                  broadcastType,
                }}
                accountLabels={accountLabels}
              />
            </div>
            <div className="flex text-sm items-center gap-1.5 ml-auto">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1">
                    {rewardsState.state === "NOT_FETCHED" && (
                      <span className="cursor-default text-muted-foreground flex gap-1 items-center">
                        Calculating rewards <IconLoader size={16} />
                      </span>
                    )}
                    {rewardsState.state === "NO_REWARDS" && (
                      <span className="cursor-default text-muted-foreground">No outstanding rewards</span>
                    )}
                    {rewardsState.state === "REWARDS_FETCHED" && (
                      <button
                        className={cn(
                          rewardsState.totalRewardAmount === 0
                            ? "cursor-default text-muted-foreground"
                            : "cursor-pointer underline hover:text-muted-foreground"
                        )}
                        disabled={rewardsState.totalRewardAmount === 0}
                        onClick={() => {
                          setRewardsDialogOpen(true);
                        }}
                      >
                        Collect rewards
                      </button>
                    )}
                    {rewardsState.state === "EARNING_REWARDS" && (
                      <span className="cursor-default text-muted-foreground">Earning rewards</span>
                    )}
                    {rewardsState.state === "ERROR" && (
                      <span className="cursor-default text-muted-foreground">No outstanding rewards</span>
                    )}
                    {rewardsState.state !== "NOT_FETCHED" && (
                      <IconInfoCircle size={16} className="text-muted-foreground" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>{rewardsState.tooltipContent}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="text-muted-foreground mt-8">
            <dl className="flex justify-between items-center gap-1.5">
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
                          accountSummary.lendingAmountMaintenance
                        )} - ${usdFormatter.format(accountSummary.borrowingAmountMaintenance)}) / (${usdFormatter.format(
                          accountSummary.lendingAmountMaintenance
                        )})`}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </dt>
              <dd
                className="text-xl md:text-2xl font-medium flex flex-row items-center gap-1.5"
                style={{ color: healthColor }}
              >
                {accountSummary.healthSimFailed && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="inline-flex items-center gap-1">
                        <IconAlertCircle size={16} className="text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>
                          Health simulation failed. The displayed health factor is estimated and may not reflect
                          real-time accuracy. Refresh the page to try again.
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {numeralFormatter(accountSummary.healthFactor * 100)}%
              </dd>
            </dl>
            <div className="h-2 bg-background-gray-light rounded-full mt-1 mb-4">
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
        </div>
        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="grid max-w-fit grid-cols-2">
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1">
              <IconChartAreaLine size={18} /> Analytics
            </TabsTrigger>
          </TabsList>
          <TabsContent value="portfolio" className="mt-6">
            <div ref={containerRef} className="relative flex flex-col gap-6">
              {/* E-mode backdrop overlay - click anywhere to disable */}
              {filterEmode && (
                <div
                  className="fixed inset-0 z-[1] bg-black/80 transition-opacity duration-500"
                  onClick={() => {
                    setFilterEmode(false);
                  }}
                  onMouseDown={(e) => {
                    // Prevent text selection when clicking backdrop
                    e.preventDefault();
                  }}
                />
              )}
              <div
                className={cn(
                  "transition-opacity duration-500 absolute inset-0 pointer-events-none z-10",
                  filterEmode ? "opacity-100" : "opacity-0"
                )}
              >
                <LineConnectionSvg />
              </div>
              {emodePairs.length > 0 && (
                <div
                  className="relative z-[2]"
                  onClick={(e) => {
                    if (filterEmode) {
                      e.stopPropagation();
                    }
                  }}
                >
                  <EmodePortfolio
                    extendedBankInfos={sortedBanks}
                    userActiveEmodes={userActiveEmodes}
                    filterEmode={filterEmode}
                    setFilterEmode={setFilterEmode}
                  />
                </div>
              )}
              <div className="flex flex-col md:flex-row justify-between flex-wrap gap-8 md:gap-40">
                <div className="flex flex-col flex-1 gap-4 md:min-w-[340px] relative z-[2]">
                  <dl className="flex justify-between items-center gap-2 text-xl font-medium">
                    <dt>Supplied</dt>
                    <dd className="text-lg">{accountSupplied}</dd>
                  </dl>
                  {isStoreInitialized ? (
                    lendingBanks.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {lendingBanks.map((bank, i) => {
                          const eModeActive = userActiveEmodes.some(
                            (pair) => pair.collateralBankTag === bank.info.rawBank.emode.emodeTag
                          );
                          const pairIndices = assetToPairIndices[bank.address.toBase58()] || [];
                          return (
                            <div
                              key={bank.meta.tokenSymbol}
                              ref={(el) => {
                                lendingRefs.current[bank.address.toBase58()] = el;
                              }}
                              className={cn(
                                "transition-opacity duration-500 relative z-[2]",
                                filterEmode && "cursor-pointer",
                                filterEmode && !eModeActive && "opacity-20"
                              )}
                              onMouseEnter={() => {
                                if (hoverDebounceRef.current) clearTimeout(hoverDebounceRef.current);
                                hoverDebounceRef.current = setTimeout(() => {
                                  if (pairIndices.length > 0) setHoveredPairIndices(pairIndices);
                                }, 120);
                              }}
                              onMouseLeave={() => {
                                if (hoverDebounceRef.current) clearTimeout(hoverDebounceRef.current);
                                hoverDebounceRef.current = setTimeout(() => {
                                  setHoveredPairIndices(null);
                                }, 120);
                              }}
                              onClick={(e) => {
                                if (filterEmode) {
                                  e.stopPropagation();
                                  setFilterEmode(false);
                                }
                              }}
                            >
                              <PortfolioAssetCard
                                bank={bank}
                                isInLendingMode={true}
                                isBorrower={borrowingBanks.length > 0}
                                accountLabels={accountLabels}
                                variant={filterEmode ? "simple" : "accordion"}
                                {...(!filterEmode && {
                                  disabled: filterEmode,
                                  open: !!openAccordions[bank.meta.tokenSymbol],
                                  onOpenChange: (isOpen: boolean) =>
                                    setOpenAccordions((prev) => ({
                                      ...prev,
                                      [bank.meta.tokenSymbol]: isOpen,
                                    })),
                                })}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-muted-foreground flex flex-wrap items-center gap-1">
                        <span>No lending positions found.</span>
                        <span
                          className="border-b border-primary/50 transition-colors hover:border-primary cursor-pointer"
                          onClick={() => {
                            setGlobalActionBoxProps({
                              ...globalActionBoxProps,
                              isOpen: true,
                              actionType: ActionType.Deposit,
                            });
                          }}
                        >
                          Search the pools
                        </span>
                        <span>to lend assets.</span>
                      </div>
                    )
                  ) : (
                    <PortfolioAssetCardSkeleton />
                  )}
                </div>
                <div className="flex flex-wrap flex-col flex-1 gap-4 md:min-w-[340px] relative z-[2]">
                  <dl className="flex justify-between items-center gap-2 text-xl font-medium">
                    <dt>Borrowed</dt>
                    <dd className="text-lg">{accountBorrowed}</dd>
                  </dl>
                  {isStoreInitialized ? (
                    borrowingBanks.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {borrowingBanks.map((bank) => {
                          const pairIndices = assetToPairIndices[bank.address.toBase58()] || [];
                          return (
                            <div
                              key={bank.address.toBase58()}
                              ref={(el) => {
                                borrowingRefs.current[bank.address.toBase58()] = el;
                              }}
                              className="relative z-[2]"
                              onMouseEnter={() => {
                                if (hoverDebounceRef.current) clearTimeout(hoverDebounceRef.current);
                                hoverDebounceRef.current = setTimeout(() => {
                                  if (pairIndices.length > 0) setHoveredPairIndices(pairIndices);
                                }, 120);
                              }}
                              onMouseLeave={() => {
                                if (hoverDebounceRef.current) clearTimeout(hoverDebounceRef.current);
                                hoverDebounceRef.current = setTimeout(() => {
                                  setHoveredPairIndices(null);
                                }, 120);
                              }}
                              onClick={(e) => {
                                if (filterEmode) {
                                  e.stopPropagation();
                                  setFilterEmode(false);
                                }
                              }}
                            >
                              <PortfolioAssetCard
                                bank={bank}
                                isInLendingMode={false}
                                isBorrower={borrowingBanks.length > 0}
                                accountLabels={accountLabels}
                                variant={filterEmode ? "simple" : "accordion"}
                                {...(!filterEmode && {
                                  disabled: filterEmode,
                                  open: !!openAccordions[bank.meta.tokenSymbol],
                                  onOpenChange: (isOpen: boolean) =>
                                    setOpenAccordions((prev) => ({
                                      ...prev,
                                      [bank.meta.tokenSymbol]: isOpen,
                                    })),
                                })}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-muted-foreground flex flex-wrap items-center gap-1">
                        <span>No borrow positions found.</span>
                        <span
                          className="border-b border-primary/50 transition-colors hover:border-primary cursor-pointer"
                          onClick={() => {
                            setGlobalActionBoxProps({
                              ...globalActionBoxProps,
                              isOpen: true,
                              actionType: ActionType.Borrow,
                            });
                          }}
                        >
                          Search the pools
                        </span>{" "}
                        <span>and open a new borrow.</span>
                      </div>
                    )
                  ) : (
                    <PortfolioAssetCardSkeleton />
                  )}
                </div>
              </div>
              <RewardsDialog
                availableRewards={rewardsState}
                onClose={() => {
                  setRewardsDialogOpen(false);
                }}
                open={rewardsDialogOpen}
                onOpenChange={(open) => {
                  setRewardsDialogOpen(open);
                }}
                onCollect={handleCollectRewardsAction}
                isLoading={rewardsLoading}
              />
            </div>
          </TabsContent>
          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-8">
              <PortfolioChart
                deposits={accountSummary.lendingAmountEquity}
                borrows={accountSummary.borrowingAmountEquity}
              />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Interest Earned</h3>
                <InterestChart
                  chartData={interestEarnedState.chartData}
                  bankSymbols={interestEarnedState.bankSymbols}
                  loading={interestEarnedState.loading}
                  error={interestEarnedState.error}
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Interest Paid</h3>
                <InterestChart
                  chartData={interestPaidState.chartData}
                  bankSymbols={interestPaidState.bankSymbols}
                  loading={interestPaidState.loading}
                  error={interestPaidState.error}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
