import { EmodePair, EmodeTag, ValidatorStakeGroup } from "@mrgnlabs/marginfi-client-v2";
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
  useNativeStakeData,
  useWrappedMarginfiAccount,
  useMarginfiAccount,
} from "@mrgnlabs/mrgn-state";
import { useMemo, useCallback } from "react";
import { AssetListModel } from "~/components/desktop/AssetList/utils";
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
import { determineBankCategories } from "~/components/desktop/AssetList/utils/tableHelperUtils";
import React from "react";

// Create token filter sets for faster lookups
const STABLECOIN_SET = new Set(STABLECOINS);
const LST_SET = new Set(LSTS);
const MEME_SET = new Set(MEMES);

export type AssetListData = {
  lendData: AssetListModel[];
  borrowData: AssetListModel[];
  emodeGroups: EmodePair[];
  isReady: boolean;
};

export function useAssetData(): AssetListData {
  const [isFilteredUserPositions, tokenFilter, lendingMode] = useUiStore((state) => [
    state.isFilteredUserPositions,
    state.tokenFilter,
    state.lendingMode,
  ]);

  const { walletContextState, connected } = useWallet();

  // Data hooks
  const { data: userBalances } = useUserBalances();
  const { data: stakeAccounts } = useUserStakeAccounts();
  const { stakePoolMetadataMap } = useNativeStakeData();

  const stakeAccountsBankMap = useMemo(() => {
    if (!stakeAccounts || stakePoolMetadataMap.size === 0) {
      return new Map<string, ValidatorStakeGroup>();
    }

    const map = new Map<string, ValidatorStakeGroup>();

    // For every bankKey → metadata entry:
    stakePoolMetadataMap.forEach((metadata, bankKey) => {
      // Find the user's stake group whose validator matches metadata.validatorVoteAccount
      const stakeGroup = stakeAccounts.find((group) => group.validator.equals(metadata.validatorVoteAccount));
      if (stakeGroup) {
        map.set(bankKey, stakeGroup);
      }
    });

    return map;
  }, [stakeAccounts, stakePoolMetadataMap]);

  const { data: selectedAccount } = useMarginfiAccount();
  const { activeEmodePairs, emodePairs } = useEmode();

  const { extendedBanks } = useExtendedBanks();
  const refreshUserData = useRefreshUserData();

  const isReady = React.useMemo(() => {
    return extendedBanks.length > 0;
  }, [extendedBanks]);

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

  // Pre-compute expensive bank transformations for BOTH lending modes once and memoize them
  const preComputedBankData = useMemo(() => {
    if (!extendedBanks.length) return { lend: new Map(), borrow: new Map(), sortedBanks: [] };

    // Sort banks by total deposits * price (TVL) in descending order
    const sortedBanks = extendedBanks.sort(
      (a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
    );

    const lendBankMap = new Map();
    const borrowBankMap = new Map();

    for (const bank of sortedBanks) {
      const collateralBanks = (emodeBankGroups.collateral as Record<string, any>)[bank.address.toBase58()] || [];
      const liabilityBanks = (emodeBankGroups.liability as Record<string, any>)[bank.address.toBase58()] || [];
      const stakePoolMetadata = stakePoolMetadataMap.get(bank.address.toBase58());
      // Pre-compute all expensive transformations for LEND mode
      const lendRowData = {
        asset: getAssetData(bank, true, undefined, collateralBanks, liabilityBanks),
        validator: stakePoolMetadata?.validatorVoteAccount || "",
        "validator-rate": stakePoolMetadata?.validatorRewards || "",
        price: getAssetPriceData(bank),
        rate: getRateData(bank, true),
        weight: getAssetWeightData(
          bank,
          true,
          extendedBanks,
          undefined,
          collateralBanks,
          liabilityBanks,
          activeEmodePairs
        ),
        deposits: getDepositsData(bank, true),
        bankCap: getBankCapData(bank, true),
        utilization: getUtilizationData(bank),
        position: getPositionData(
          bank,
          userBalances?.nativeSolBalance || 0,
          true,
          categorizedBanks.solPrice,
          stakeAccountsBankMap.get(bank.address.toBase58())
        ),
        action: getAction(bank, true, connected, walletContextState, refreshUserData, selectedAccount),
        assetCategory: determineBankCategories(bank),
      };

      // Pre-compute all expensive transformations for BORROW mode
      const borrowRowData = {
        asset: getAssetData(bank, false, undefined, collateralBanks, liabilityBanks),
        validator: (bank.meta as any).stakePool?.validatorVoteAccount || "",
        "validator-rate": (bank.meta as any).stakePool?.validatorRewards || "",
        price: getAssetPriceData(bank),
        rate: getRateData(bank, false),
        weight: getAssetWeightData(
          bank,
          false,
          extendedBanks,
          undefined,
          collateralBanks,
          liabilityBanks,
          activeEmodePairs
        ),
        deposits: getDepositsData(bank, false),
        bankCap: getBankCapData(bank, false),
        utilization: getUtilizationData(bank),
        position: getPositionData(
          bank,
          userBalances?.nativeSolBalance || 0,
          false,
          categorizedBanks.solPrice,
          stakeAccountsBankMap.get(bank.address.toBase58())
        ),
        action: getAction(bank, false, connected, walletContextState, refreshUserData, selectedAccount),
        assetCategory: determineBankCategories(bank),
      };

      lendBankMap.set(bank.address.toBase58(), lendRowData);
      borrowBankMap.set(bank.address.toBase58(), borrowRowData);
    }

    return { lend: lendBankMap, borrow: borrowBankMap, sortedBanks };
  }, [
    extendedBanks,
    emodeBankGroups.collateral,
    emodeBankGroups.liability,
    stakePoolMetadataMap,
    activeEmodePairs,
    userBalances?.nativeSolBalance,
    categorizedBanks.solPrice,
    stakeAccountsBankMap,
    connected,
    walletContextState,
    refreshUserData,
    selectedAccount,
  ]);

  // Lightweight filtering functions that just map categorized banks to pre-computed data
  const createTableData = useCallback(
    (banks: typeof extendedBanks, mode: "lend" | "borrow") => {
      return banks.map((bank) => preComputedBankData[mode].get(bank.address.toBase58())).filter(Boolean);
    },
    [preComputedBankData]
  );

  const lendData = useMemo(() => {
    if (!extendedBanks.length) return [];
    return createTableData(preComputedBankData.sortedBanks || extendedBanks, "lend");
  }, [extendedBanks, createTableData, preComputedBankData.sortedBanks]);

  const borrowData = useMemo(() => {
    if (!extendedBanks.length) return [];
    return createTableData(preComputedBankData.sortedBanks || extendedBanks, "borrow");
  }, [extendedBanks, createTableData, preComputedBankData.sortedBanks]);

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
    lendData,
    borrowData,
    emodeGroups,
    isReady,
  };
}
