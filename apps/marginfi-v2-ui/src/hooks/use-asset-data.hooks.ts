import { EmodePair, EmodeTag } from "@mrgnlabs/marginfi-client-v2";
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
import {
  getAssetData,
  getAssetPriceData,
  getRateData,
  getAssetWeightData,
  getDepositsData,
  getBankCapData,
  getUtilizationData,
  getPositionData,
} from "@mrgnlabs/mrgn-utils";
import { getAction } from "~/components/desktop/AssetList/utils";
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
  // const { data: userBalances } = useUserBalances(walletAddress);
  const { data: stakeAccounts } = useUserStakeAccounts(walletAddress);
  // const { wrappedAccount: selectedAccount } = useWrappedMarginfiAccount(walletAddress);
  // const { activeEmodePairs, emodePairs } = useEmode(walletAddress);

  const selectedAccount = useMemo(() => null, []);
  const activeEmodePairs: EmodePair[] = useMemo(() => [], []);
  const emodePairs: EmodePair[] = useMemo(() => [], []);
  const userBalances = useMemo(
    () => ({
      nativeSolBalance: 0,
      ataList: [],
    }),
    []
  );

  const { extendedBanks } = useExtendedBanks(walletAddress);
  const refreshUserData = useMemo(() => () => {}, []); //useRefreshUserData(walletAddress);

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

  // Common stable parameters to prevent unnecessary recalculations
  const commonParams = useMemo(
    () => ({
      isInLendingMode,
      nativeSolBalance: userBalances?.nativeSolBalance ?? 0,
      selectedAccount,
      connected,
      walletContextState,
      solPrice: categorizedBanks.solPrice,
      refreshUserData: refreshUserData,
      activeEmodePairs,
      collateralBanks: emodeBankGroups.collateral,
      liabilityBanks: emodeBankGroups.liability,
    }),
    [
      isInLendingMode,
      userBalances?.nativeSolBalance,
      selectedAccount,
      connected,
      walletContextState,
      categorizedBanks.solPrice,
      refreshUserData,
      activeEmodePairs,
      emodeBankGroups.collateral,
      emodeBankGroups.liability,
    ]
  );

  // Pre-compute expensive bank transformations once and memoize them
  const preComputedBankData = useMemo(() => {
    if (!extendedBanks.length) return new Map();

    const bankMap = new Map();

    for (const bank of extendedBanks) {
      const collateralBanks = (emodeBankGroups.collateral as Record<string, any>)[bank.address.toBase58()] || [];
      const liabilityBanks = (emodeBankGroups.liability as Record<string, any>)[bank.address.toBase58()] || [];

      // Pre-compute all expensive transformations once per bank
      const bankRowData = {
        asset: getAssetData(bank, commonParams.isInLendingMode, undefined, collateralBanks, liabilityBanks),
        validator: (bank.meta as any).stakePool?.validatorVoteAccount || "",
        "validator-rate": (bank.meta as any).stakePool?.validatorRewards || "",
        price: getAssetPriceData(bank),
        rate: getRateData(bank, commonParams.isInLendingMode),
        weight: getAssetWeightData(
          bank,
          commonParams.isInLendingMode,
          extendedBanks,
          undefined,
          collateralBanks,
          liabilityBanks,
          commonParams.activeEmodePairs
        ),
        deposits: getDepositsData(bank, commonParams.isInLendingMode),
        bankCap: getBankCapData(bank, commonParams.isInLendingMode),
        utilization: getUtilizationData(bank),
        position: getPositionData(
          bank,
          commonParams.nativeSolBalance,
          commonParams.isInLendingMode,
          commonParams.solPrice
        ),
        action: getAction(
          bank,
          commonParams.isInLendingMode,
          commonParams.selectedAccount,
          commonParams.connected,
          commonParams.walletContextState,
          commonParams.refreshUserData
        ),
      };

      bankMap.set(bank.address.toBase58(), bankRowData);
    }

    return bankMap;
  }, [extendedBanks, commonParams, emodeBankGroups.collateral, emodeBankGroups.liability]);

  // Lightweight filtering functions that just map categorized banks to pre-computed data
  const createTableData = useCallback(
    (banks: typeof extendedBanks) => {
      return banks.map((bank) => preComputedBankData.get(bank.address.toBase58())).filter(Boolean);
    },
    [preComputedBankData]
  );

  // Table data calculations with optimized dependencies
  const globalPoolTableData = useMemo(() => {
    if (!categorizedBanks.global.length) return [];
    return createTableData(categorizedBanks.global);
  }, [categorizedBanks.global, createTableData]);

  const isolatedPoolTableData = useMemo(() => {
    if (!categorizedBanks.isolated.length) return [];
    return createTableData(categorizedBanks.isolated);
  }, [categorizedBanks.isolated, createTableData]);

  const stakedPoolTableData = useMemo(() => {
    if (!categorizedBanks.staked.length) return [];
    return createTableData(categorizedBanks.staked);
  }, [categorizedBanks.staked, createTableData]);

  const emodePoolTableData = useMemo(() => {
    if (!categorizedBanks.emode.length) return [];
    return createTableData(categorizedBanks.emode);
  }, [categorizedBanks.emode, createTableData]);

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
