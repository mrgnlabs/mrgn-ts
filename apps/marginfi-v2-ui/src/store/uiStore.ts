import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import {
  MaxCapType,
  TransactionBroadcastType,
  TransactionPriorityType,
  TransactionSettings,
} from "@mrgnlabs/mrgn-common";
import { LendingModes, PoolTypes, DEFAULT_PRIORITY_SETTINGS, fetchPriorityFee } from "@mrgnlabs/mrgn-utils";

import { SortType, sortDirection, SortAssetOption } from "~/types";
import { Connection } from "@solana/web3.js";
import { PriorityFees } from "@mrgnlabs/marginfi-client-v2";

const SORT_OPTIONS_MAP: { [key in SortType]: SortAssetOption } = {
  APY_DESC: {
    label: "APY highest to lowest",
    borrowLabel: "APY highest to lowest",
    value: SortType.APY_DESC,
    field: "APY",
    direction: sortDirection.DESC,
  },
  APY_ASC: {
    label: "APY lowest to highest",
    borrowLabel: "APY lowest to highest",
    value: SortType.APY_ASC,
    field: "APY",
    direction: sortDirection.ASC,
  },
  TVL_DESC: {
    label: "$ highest to lowest",
    value: SortType.TVL_DESC,
    field: "TVL",
    direction: sortDirection.DESC,
  },
  TVL_ASC: {
    label: "$ lowest to highest",
    value: SortType.TVL_ASC,
    field: "TVL",
    direction: sortDirection.ASC,
  },
};

interface UiState {
  // State
  isMenuDrawerOpen: boolean;
  isFetchingData: boolean;
  isFilteredUserPositions: boolean;
  isOraclesStale: boolean;
  lendingMode: LendingModes;
  poolFilter: PoolTypes;
  sortOption: SortAssetOption;
  assetListSearch: string;
  broadcastType: TransactionBroadcastType;
  priorityType: TransactionPriorityType;
  maxCap: number;
  maxCapType: MaxCapType;
  priorityFees: PriorityFees;

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => void;
  setIsFetchingData: (isOpen: boolean) => void;
  setIsFilteredUserPositions: (isFilteredUserPositions: boolean) => void;
  setIsOraclesStale: (isOraclesStale: boolean) => void;
  setLendingMode: (lendingMode: LendingModes) => void;
  setPoolFilter: (poolType: PoolTypes) => void;
  setSortOption: (sortOption: SortAssetOption) => void;
  setAssetListSearch: (search: string) => void;
  setTransactionSettings: (settings: TransactionSettings, connection: Connection) => void;
  fetchPriorityFee: (connection: Connection, settings?: TransactionSettings) => void;
}

function createUiStore() {
  return create<UiState>()(
    persist(stateCreator, {
      name: "uiStore",
      onRehydrateStorage: () => (state) => {},
    })
  );
}

const stateCreator: StateCreator<UiState, [], []> = (set, get) => ({
  // State
  isMenuDrawerOpen: false,
  isFetchingData: false,
  isFilteredUserPositions: false,
  isOraclesStale: false,
  lendingMode: LendingModes.LEND,
  poolFilter: PoolTypes.ALL,
  sortOption: SORT_OPTIONS_MAP[SortType.TVL_DESC],
  assetListSearch: "",
  ...DEFAULT_PRIORITY_SETTINGS,
  priorityFees: {},

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => set({ isMenuDrawerOpen: isOpen }),
  setIsFetchingData: (isFetchingData: boolean) => set({ isFetchingData }),
  setIsFilteredUserPositions: (isFilteredUserPositions: boolean) =>
    set({ isFilteredUserPositions: isFilteredUserPositions }),
  setLendingMode: (lendingMode: LendingModes) =>
    set({
      lendingMode: lendingMode,
    }),
  setIsOraclesStale: (isOraclesStale: boolean) => set({ isOraclesStale: isOraclesStale }),
  setPoolFilter: (poolType: PoolTypes) => set({ poolFilter: poolType }),
  setSortOption: (sortOption: SortAssetOption) => set({ sortOption: sortOption }),
  setAssetListSearch: (search: string) => set({ assetListSearch: search }),
  setTransactionSettings: (settings: TransactionSettings, connection: Connection) => {
    set({ ...settings });
    get().fetchPriorityFee(connection, settings);
  },
  fetchPriorityFee: async (connection: Connection, settings?: TransactionSettings) => {
    const { maxCapType, maxCap, priorityType, broadcastType } = settings ?? get();

    try {
      const priorityFees = await fetchPriorityFee(maxCapType, maxCap, broadcastType, priorityType, connection);
      console.log("priorityFees", priorityFees);
      set({ priorityFees });
    } catch (error) {
      console.error(error);
    }
  },
});

export { createUiStore, SORT_OPTIONS_MAP };
export type { UiState };
