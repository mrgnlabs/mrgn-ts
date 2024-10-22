import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { IconInfoCircle } from "@tabler/icons-react";

import { nativeToUi, numeralFormatter, Wallet } from "@mrgnlabs/mrgn-common";
import { usdFormatter, usdFormatterDyn } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes } from "@mrgnlabs/mrgn-utils";

import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";

import { PortfolioUserStats, PortfolioAssetCard, PortfolioAssetCardSkeleton } from "~/components/common/Portfolio";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { WalletButton } from "~/components/wallet-v2";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { Loader } from "~/components/ui/loader";
import { RewardsDialog } from "../rewards";
import { ActionComplete } from "~/components/common/ActionComplete";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { EMISSION_MINT_INFO_MAP } from "~/components/desktop/AssetList/components";
import { Balance, Bank, makeBundleTipIx, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import BigNumber from "bignumber.js";
import { margin } from "@mui/system";

export type rewardsType = {
  totalReward: number;
  rewards: { bank: string; amount: number }[];
};

export const LendingPortfolio = () => {
  const router = useRouter();
  const { connected } = useWallet();
  const [walletConnectionDelay, setWalletConnectionDelay] = React.useState(false);

  const [
    isStoreInitialized,
    sortedBanks,
    accountSummary,
    isRefreshingStore,
    marginfiClient,
    selectedAccount,
    extendedBankInfos,
  ] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfos,
    state.accountSummary,
    state.isRefreshingStore,
    state.marginfiClient,
    state.selectedAccount,
    state.extendedBankInfos,
  ]);

  const [setLendingMode] = useUiStore((state) => [state.setLendingMode]);

  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData]);

  const bankAddressesWithEmissions: PublicKey[] = React.useMemo(() => {
    if (!selectedAccount) return [];
    return [...EMISSION_MINT_INFO_MAP.keys()]
      .map((bankMintSymbol) => {
        const bankInfo = extendedBankInfos?.find((b) => b.address && b.meta.tokenSymbol === bankMintSymbol);
        if (bankInfo?.info.state.emissions.toString() === "1") return bankInfo?.address;
      })
      .filter((address) => address !== undefined) as PublicKey[];
  }, [selectedAccount, extendedBankInfos]); // TODO: confirm this is correct. I'm not sure, but some info.state.emissions are 0 and some are 1. For now i'm assuming that the banks with emissions are the ones with state.emissions = 1

  const [collectTxn, setCollectTxn] = React.useState<VersionedTransaction | null>(null);

  const generateCollectTransaction = React.useCallback(async () => {
    if (!marginfiClient || !selectedAccount) return;

    const ixs: TransactionInstruction[] = [];
    const bundleTipIx = makeBundleTipIx(marginfiClient?.wallet.publicKey);
    const priorityFeeIx = selectedAccount?.makePriorityFeeIx(0); // TODO: set priorityfee
    const connection = marginfiClient?.provider.connection; // TODO: fix
    if (!connection) return; // TODO: handle
    const blockhash = (await connection.getLatestBlockhash()).blockhash;

    for (let bankAddress of bankAddressesWithEmissions) {
      const ix = await selectedAccount?.makeWithdrawEmissionsIx(bankAddress);
      if (!ix) continue;
      ixs.push(...ix.instructions);
    } // TODO: promise.all

    const tx = new VersionedTransaction(
      new TransactionMessage({
        instructions: [bundleTipIx, ...priorityFeeIx, ...ixs],
        payerKey: selectedAccount?.authority,
        recentBlockhash: blockhash,
      }).compileToV0Message()
    );

    setCollectTxn(tx);
  }, [marginfiClient, selectedAccount, setCollectTxn, bankAddressesWithEmissions]);

  const simulateCollectTransaction = React.useCallback(async () => {
    if (!collectTxn || !marginfiClient || !selectedAccount) return; // TODO: handle

    const balancesBeforeSimulation = selectedAccount.balances.filter((balance) =>
      bankAddressesWithEmissions.map((b) => b.toBase58()).includes(balance.bankPk.toBase58())
    );

    console.log(balancesBeforeSimulation[0].emissionsOutstanding.toNumber());

    const simulationResults = await marginfiClient.simulateTransactions(
      [collectTxn],
      [selectedAccount.address, ...bankAddressesWithEmissions]
    );

    if (!simulationResults || simulationResults.length === 0) return; // TODO: handle

    const [mfiAccountData, ...banksData] = simulationResults; // The first element is the account data, rest are the banks

    if (banksData.length !== bankAddressesWithEmissions.length) return; // TODO: handle

    const previewBanks = marginfiClient.banks;
    for (let i = 0; i < bankAddressesWithEmissions.length; i++) {
      const bankAddress = bankAddressesWithEmissions[i];
      const bankData = banksData[i];
      if (!bankData) continue;
      previewBanks.set(
        bankAddress.toBase58(),
        Bank.fromBuffer(bankAddress, bankData, marginfiClient.program.idl, marginfiClient.feedIdMap)
      );
    }

    const previewClient = new MarginfiClient(
      marginfiClient.config,
      marginfiClient.program,
      {} as Wallet,
      true,
      marginfiClient.group,
      previewBanks,
      marginfiClient.oraclePrices,
      marginfiClient.mintDatas,
      marginfiClient.feedIdMap
    );

    if (!mfiAccountData) return;

    const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
      selectedAccount.address,
      previewClient,
      mfiAccountData,
      marginfiClient.program.idl
    );

    const balancesAfterSimulation = previewMarginfiAccount.balances.filter((balance) =>
      bankAddressesWithEmissions.map((b) => b.toBase58()).includes(balance.bankPk.toBase58())
    );
    console.log(balancesAfterSimulation[0].emissionsOutstanding.toNumber());

    compareBankBalancesForEmissions(previewMarginfiAccount);
  }, [marginfiClient, selectedAccount, collectTxn, bankAddressesWithEmissions]);

  const compareBankBalancesForEmissions = (originalAccount: MarginfiAccountWrapper) => {
    const banksWithOustandingEmissions = originalAccount.balances.filter((b) =>
      b.emissionsOutstanding.isGreaterThan(0)
    );

    const outstandingRewards = banksWithOustandingEmissions.map((b) => {
      const bank = marginfiClient?.getBankByPk(b.bankPk);

      return {
        bank: bank,
        amount: b.emissionsOutstanding.toNumber(),
      };
    });

    // console.log(outstandingRewards);
  };

  const handleCollectAction = async () => {
    if (!collectTxn || !marginfiClient) return;

    const sig = await marginfiClient.processTransaction(collectTxn);

    // console.log(sig);
  };

  useEffect(() => {
    simulateCollectTransaction();
  }, [collectTxn, marginfiClient, bankAddressesWithEmissions, selectedAccount]);

  useEffect(() => {
    generateCollectTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAddressesWithEmissions, marginfiClient, selectedAccount]);

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

  const [rewards, setRewards] = React.useState<rewardsType>({
    totalReward: 100,
    rewards: [
      {
        bank: "JitoSOL",
        amount: 10,
      },
      {
        bank: "SOL",
        amount: 10,
      },
      {
        bank: "SOL",
        amount: 10,
      },
      {
        bank: "SOL",
        amount: 10,
      },
    ],
  });

  const [rewardsDialogOpen, setRewardsDialogOpen] = React.useState(false);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  // Introduced this useEffect to show the loader for 2 seconds after wallet connection. This is to avoid the flickering of the loader, since the isRefreshingStore isnt set immediately after the wallet connection.
  useEffect(() => {
    if (connected) {
      setWalletConnectionDelay(true);
      const timer = setTimeout(() => {
        setWalletConnectionDelay(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [connected]);

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
    <div className="p-4 md:p-6 rounded-xl space-y-3 w-full mb-10  bg-background-gray-dark">
      <div className="flex justify-between w-full">
        <h2 className="font-medium text-xl">Lend/borrow</h2>
        <span
          className="cursor-pointer hover:text-[#AAA] underline"
          onClick={() => {
            setRewardsDialogOpen(true);
          }}
        >
          Collect Rewards
        </span>
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
        onCollect={handleCollectAction}
      />
      {previousTxn && <ActionComplete />}
    </div>
  );
};
