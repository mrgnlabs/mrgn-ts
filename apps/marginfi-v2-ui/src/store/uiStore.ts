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
import { MarginfiAccountWrapper, PriorityFees } from "@mrgnlabs/marginfi-client-v2";
import { defaultJupiterOptions, JupiterOptions } from "~/components";

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
  slippageBps: number;
  poolFilter: PoolTypes;
  sortOption: SortAssetOption;
  assetListSearch: string;
  broadcastType: TransactionBroadcastType;
  priorityType: TransactionPriorityType;
  maxCapType: MaxCapType;
  priorityFees: PriorityFees;
  accountLabels: Record<string, string>;
  displaySettings: boolean;
  jupiterOptions: JupiterOptions;

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => void;
  setIsFetchingData: (isOpen: boolean) => void;
  setIsFilteredUserPositions: (isFilteredUserPositions: boolean) => void;
  setIsOraclesStale: (isOraclesStale: boolean) => void;
  setLendingMode: (lendingMode: LendingModes) => void;
  setSlippageBps: (slippageBps: number) => void;
  setPoolFilter: (poolType: PoolTypes) => void;
  setSortOption: (sortOption: SortAssetOption) => void;
  setAssetListSearch: (search: string) => void;
  setTransactionSettings: (settings: TransactionSettings, connection: Connection) => void;
  fetchPriorityFee: (connection: Connection, settings?: TransactionSettings) => void;
  fetchAccountLabels: (accounts: MarginfiAccountWrapper[]) => Promise<void>;
  setDisplaySettings: (displaySettings: boolean) => void;
  setJupiterOptions: (jupiterOptions: JupiterOptions) => void;
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
  slippageBps: 100,
  isMenuDrawerOpen: false,
  isFetchingData: false,
  isFilteredUserPositions: false,
  isOraclesStale: false,
  lendingMode: LendingModes.LEND,
  poolFilter: PoolTypes.ALL,
  sortOption: SORT_OPTIONS_MAP[SortType.TVL_DESC],
  assetListSearch: "",
  priorityFees: {},
  accountLabels: {},
  ...DEFAULT_PRIORITY_SETTINGS,
  displaySettings: false,
  jupiterOptions: defaultJupiterOptions,

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => set({ isMenuDrawerOpen: isOpen }),
  setIsFetchingData: (isFetchingData: boolean) => set({ isFetchingData }),
  setIsFilteredUserPositions: (isFilteredUserPositions: boolean) =>
    set({ isFilteredUserPositions: isFilteredUserPositions }),
  setLendingMode: (lendingMode: LendingModes) =>
    set({
      lendingMode: lendingMode,
    }),
  setSlippageBps: (slippageBps: number) => set({ slippageBps: slippageBps }),
  setIsOraclesStale: (isOraclesStale: boolean) => set({ isOraclesStale: isOraclesStale }),
  setPoolFilter: (poolType: PoolTypes) => set({ poolFilter: poolType }),
  setSortOption: (sortOption: SortAssetOption) => set({ sortOption: sortOption }),
  setAssetListSearch: (search: string) => set({ assetListSearch: search }),
  setTransactionSettings: (settings: TransactionSettings, connection: Connection) => {
    const { broadcastType, priorityType, maxCapType } = settings;
    set({ broadcastType, priorityType, maxCapType });
    get().fetchPriorityFee(connection, settings);
  },
  fetchPriorityFee: async (connection: Connection, settings?: TransactionSettings) => {
    const { priorityType, broadcastType, maxCapType } = settings ?? get();

    let manualMaxCap;

    if (maxCapType === "MANUAL") {
      manualMaxCap = settings?.maxCap ?? get().priorityFees.maxCapUi;
    } else {
      manualMaxCap = 0;
    }

    try {
      const priorityFees = await fetchPriorityFee(broadcastType, priorityType, connection, maxCapType);
      set({
        priorityFees: {
          ...priorityFees,
          maxCapUi: manualMaxCap,
        },
      });
    } catch (error) {
      console.error(error);
    }
  },
  fetchAccountLabels: async (accounts: MarginfiAccountWrapper[]) => {
    const labels: Record<string, string> = {};

    const fetchLabel = async (account: MarginfiAccountWrapper) => {
      try {
        const response = await fetch(`/api/user/account-label?account=${account.address.toBase58()}`);
        if (!response.ok) throw new Error(`Error fetching account label for ${account.address.toBase58()}`);

        const { data } = await response.json();
        return data.label || `Account`;
      } catch (error) {
        console.error(error);
        return `Account`;
      }
    };

    const accountLabelsWithAddresses = await Promise.all(
      accounts.map(async (account) => {
        const label = await fetchLabel(account);
        return { address: account.address.toBase58(), label };
      })
    );

    // Sort labels by order: first anything that is not starting with "Account", then "Account 1", "Account 2", ...
    accountLabelsWithAddresses.sort((a, b) => {
      const isAAccountLabel = /^Account (\d+)$/.test(a.label);
      const isBAccountLabel = /^Account (\d+)$/.test(b.label);

      if (!isAAccountLabel && isBAccountLabel) return -1;
      if (isAAccountLabel && !isBAccountLabel) return 1;

      if (isAAccountLabel && isBAccountLabel) {
        const numA = parseInt(a.label.match(/^Account (\d+)$/)[1], 10);
        const numB = parseInt(b.label.match(/^Account (\d+)$/)[1], 10);
        return numA - numB;
      }

      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });

    accountLabelsWithAddresses.forEach(({ address, label }) => {
      labels[address] = label;
    });

    set({ accountLabels: labels });
  },
  setDisplaySettings: (displaySettings: boolean) => set({ displaySettings }),
  setJupiterOptions: (jupiterOptions: JupiterOptions) => {
    set({ jupiterOptions: { ...jupiterOptions, slippageBps: jupiterOptions.slippageBps * 100 } });
  },
});

export { createUiStore, SORT_OPTIONS_MAP };
export type { UiState };
