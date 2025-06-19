import { EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import {
  groupBanksByEmodeTag,
  groupCollateralBanksByLiabilityBank,
  groupLiabilityBanksByCollateralBank,
  useEmode,
  useExtendedBanks,
  useRefreshUserData,
  useUserBalances,
  useUserStakeAccounts,
  useWrappedMarginfiAccount,
} from "@mrgnlabs/mrgn-state";
import { PublicKey } from "@solana/web3.js";
import React from "react";
import { useMemo, useCallback } from "react";
import { makeData } from "~/components/desktop/AssetList/utils";
import { STABLECOINS, LSTS, MEMES } from "~/config/constants";
import { useUiStore } from "~/store";
import { TokenFilters } from "~/store/uiStore";
import { LendingModes } from "@mrgnlabs/mrgn-utils";
import { useWallet } from "~/components";

// Create token filter sets for faster lookups
const STABLECOIN_SET = new Set(STABLECOINS);
const LST_SET = new Set(LSTS);
const MEME_SET = new Set(MEMES);

export function useAssetData() {
  const [isFilteredUserPositions, tokenFilter, lendingMode] = useUiStore((state) => [
    state.isFilteredUserPositions,
    state.tokenFilter,
    state.lendingMode,
  ]);

  const { walletAddress, walletContextState, connected } = useWallet();

  const isInLendingMode = useMemo(() => lendingMode === LendingModes.LEND, [lendingMode]);

  // Data hooks
  const { data: userBalances } = useUserBalances(walletAddress);
  const { data: stakeAccounts } = useUserStakeAccounts(walletAddress);
  const { wrappedAccount: selectedAccount } = useWrappedMarginfiAccount(walletAddress);
  const { activeEmodePairs, emodePairs } = useEmode(walletAddress);
  const { extendedBanks } = useExtendedBanks(walletAddress);
  const refreshUserData = useRefreshUserData(walletAddress);

  // Memoize expensive calculations only when dependencies change
  const emodeBankGroups = useMemo(() => {
    if (!extendedBanks.length || !emodePairs.length) return { grouped: {}, collateral: {}, liability: {} };

    return {
      grouped: groupBanksByEmodeTag(extendedBanks),
      collateral: groupCollateralBanksByLiabilityBank(extendedBanks, emodePairs),
      liability: groupLiabilityBanksByCollateralBank(extendedBanks, emodePairs),
    };
  }, [extendedBanks, emodePairs]);

  // Optimized token filter function using Sets
  const filterBanksByTokenType = useCallback(
    (banks: typeof extendedBanks) => {
      if (tokenFilter === TokenFilters.ALL) return banks;

      switch (tokenFilter) {
        case TokenFilters.STABLE:
          return banks.filter((b) => STABLECOIN_SET.has(b.meta.tokenSymbol));
        case TokenFilters.LST:
          return banks.filter((b) => LST_SET.has(b.meta.tokenSymbol));
        case TokenFilters.MEME:
          return banks.filter((b) => MEME_SET.has(b.meta.tokenSymbol));
        default:
          return banks;
      }
    },
    [tokenFilter]
  );

  // Single pass filtering and categorization
  const categorizedBanks = useMemo(() => {
    if (!extendedBanks.length) {
      return {
        global: [],
        isolated: [],
        staked: [],
        emode: [],
        solPrice: null,
      };
    }

    let solPrice: number | null = null;
    const global: typeof extendedBanks = [];
    const isolated: typeof extendedBanks = [];
    const staked: typeof extendedBanks = [];
    const emode: typeof extendedBanks = [];

    for (const bank of extendedBanks) {
      // Extract SOL price while iterating
      if (!solPrice && bank.info.state.mint.equals(WSOL_MINT)) {
        solPrice = bank.info.oraclePrice.priceRealtime.price.toNumber();
      }

      // Skip if filtering for user positions and bank is inactive
      if (isFilteredUserPositions && !bank.isActive) continue;

      // Categorize banks
      const isStaked = bank.info.rawBank.config.assetTag === 2;
      const isIsolated = bank.info.state.isIsolated;
      const hasEmode = bank.info.state.hasEmode;

      if (isStaked) {
        staked.push(bank);
      } else if (isIsolated) {
        isolated.push(bank);
      } else {
        global.push(bank);
      }

      if (hasEmode) {
        emode.push(bank);
      }
    }

    // Apply token filtering to all categories at once
    return {
      global: filterBanksByTokenType(global),
      isolated: filterBanksByTokenType(isolated),
      staked: filterBanksByTokenType(staked),
      emode: filterBanksByTokenType(emode),
      solPrice,
    };
  }, [extendedBanks, isFilteredUserPositions, filterBanksByTokenType]);

  // Stable references for expensive table data calculations
  const refreshUserDataStable = useCallback(() => {
    refreshUserData();
  }, [refreshUserData]);

  // Common stable parameters to prevent unnecessary recalculations
  const commonParams = useMemo(() => ({
    isInLendingMode,
    nativeSolBalance: userBalances?.nativeSolBalance ?? 0,
    selectedAccount,
    connected,
    walletContextState,
    solPrice: categorizedBanks.solPrice,
    refreshUserData: refreshUserDataStable,
    activeEmodePairs,
    collateralBanks: emodeBankGroups.collateral,
    liabilityBanks: emodeBankGroups.liability,
  }), [
    isInLendingMode,
    userBalances?.nativeSolBalance,
    selectedAccount,
    connected,
    walletContextState,
    categorizedBanks.solPrice,
    refreshUserDataStable,
    activeEmodePairs,
    emodeBankGroups.collateral,
    emodeBankGroups.liability,
  ]);

  // Table data calculations with optimized dependencies
  const globalPoolTableData = useMemo(() => {
    if (!categorizedBanks.global.length) return [];
    
    return makeData(
      categorizedBanks.global,
      commonParams.isInLendingMode,
      commonParams.nativeSolBalance,
      commonParams.selectedAccount,
      commonParams.connected,
      commonParams.walletContextState,
      commonParams.solPrice,
      commonParams.refreshUserData,
      commonParams.activeEmodePairs,
      commonParams.collateralBanks,
      commonParams.liabilityBanks
    );
  }, [categorizedBanks.global, commonParams]);

  const isolatedPoolTableData = useMemo(() => {
    if (!categorizedBanks.isolated.length) return [];
    
    return makeData(
      categorizedBanks.isolated,
      commonParams.isInLendingMode,
      commonParams.nativeSolBalance,
      commonParams.selectedAccount,
      commonParams.connected,
      commonParams.walletContextState,
      commonParams.solPrice,
      commonParams.refreshUserData,
      commonParams.activeEmodePairs,
      commonParams.collateralBanks,
      commonParams.liabilityBanks
    );
  }, [categorizedBanks.isolated, commonParams]);

  const stakedPoolTableData = useMemo(() => {
    if (!categorizedBanks.staked.length) return [];
    
    return makeData(
      categorizedBanks.staked,
      commonParams.isInLendingMode,
      commonParams.nativeSolBalance,
      commonParams.selectedAccount,
      commonParams.connected,
      commonParams.walletContextState,
      commonParams.solPrice,
      commonParams.refreshUserData,
      commonParams.activeEmodePairs
    );
  }, [categorizedBanks.staked, commonParams]);

  const emodePoolTableData = useMemo(() => {
    if (!categorizedBanks.emode.length) return [];
    
    return makeData(
      categorizedBanks.emode,
      commonParams.isInLendingMode,
      commonParams.nativeSolBalance,
      commonParams.selectedAccount,
      commonParams.connected,
      commonParams.walletContextState,
      commonParams.solPrice,
      commonParams.refreshUserData,
      commonParams.activeEmodePairs,
      commonParams.collateralBanks,
      commonParams.liabilityBanks
    );
  }, [categorizedBanks.emode, commonParams]);

  const emodeGroups = useMemo(() => {
    if (!emodePairs.length) return [];

    const tagSet = new Set<string>();
    const groups = [];

    for (const pair of emodePairs) {
      const tagName = EmodeTag[pair.collateralBankTag];
      if (!tagSet.has(tagName)) {
        tagSet.add(tagName);
        groups.push(pair);
      }
    }

    return groups;
  }, [emodePairs]);

  return {
    globalPoolTableData,
    isolatedPoolTableData,
    stakedPoolTableData,
    emodePoolTableData,
    emodeGroups,
  };
}
