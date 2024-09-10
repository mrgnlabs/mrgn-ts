import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes, PoolTypes } from "@mrgnlabs/mrgn-utils";

import { SortType, sortDirection, SortAssetOption, PreviousTxn } from "~/types";

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
  isWalletAuthDialogOpen: boolean;
  isWalletOpen: boolean;
  isWalletOnrampActive: boolean;
  isFilteredUserPositions: boolean;
  isOraclesStale: boolean;
  lendingMode: LendingModes;
  poolFilter: PoolTypes;
  sortOption: SortAssetOption;
  priorityFee: number;
  isActionComplete: boolean;
  previousTxn: PreviousTxn | null;
  isActionBoxInputFocussed: boolean;
  assetListSearch: string;

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => void;
  setIsFetchingData: (isOpen: boolean) => void;
  setIsWalletAuthDialogOpen: (isOpen: boolean) => void;
  setIsWalletOpen: (isOpen: boolean) => void;
  setIsOnrampActive: (isOnrampActive: boolean) => void;
  setIsFilteredUserPositions: (isFilteredUserPositions: boolean) => void;
  setIsOraclesStale: (isOraclesStale: boolean) => void;
  setLendingMode: (lendingMode: LendingModes) => void;
  setPoolFilter: (poolType: PoolTypes) => void;
  setSortOption: (sortOption: SortAssetOption) => void;
  setPriorityFee: (priorityFee: number) => void;
  setIsActionComplete: (isActionSuccess: boolean) => void;
  setPreviousTxn: (previousTxn: PreviousTxn) => void;
  setIsActionBoxInputFocussed: (isFocussed: boolean) => void;
  setAssetListSearch: (search: string) => void;
}

function createUiStore() {
  return create<UiState>()(
    persist(stateCreator, {
      name: "uiStore",
      onRehydrateStorage: () => (state) => {
        // overwrite priority fee
        if (process.env.NEXT_PUBLIC_INIT_PRIO_FEE && process.env.NEXT_PUBLIC_INIT_PRIO_FEE !== "0") {
          state?.setPriorityFee(Number(process.env.NEXT_PUBLIC_INIT_PRIO_FEE));
        }

        // overwrite wallet on mobile
        // covers private key export modal when open
        if (window.innerWidth < 768) {
          state?.setIsWalletOpen(false);
        }

        // ensure input focus is not set when rehydrated
        // this is used to hide the mobile navbar when input is focussed to fix a bug specific to Backpack wallet
        state?.setIsActionBoxInputFocussed(false);
      },
    })
  );
}

const stateCreator: StateCreator<UiState, [], []> = (set, get) => ({
  // State
  isMenuDrawerOpen: false,
  isFetchingData: false,
  isWalletAuthDialogOpen: false,
  isWalletOpen: false,
  isWalletOnrampActive: false,
  isFilteredUserPositions: false,
  isOraclesStale: false,
  lendingMode: LendingModes.LEND,
  actionMode: ActionType.Deposit,
  poolFilter: PoolTypes.ALL,
  sortOption: SORT_OPTIONS_MAP[SortType.TVL_DESC],
  selectedTokenBank: null,
  priorityFee: 0,
  isActionComplete: false,
  previousTxn: null,
  isActionBoxInputFocussed: false,
  assetListSearch: "",

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => set({ isMenuDrawerOpen: isOpen }),
  setIsFetchingData: (isFetchingData: boolean) => set({ isFetchingData }),
  setIsWalletAuthDialogOpen: (isOpen: boolean) => set({ isWalletAuthDialogOpen: isOpen }),
  setIsWalletOpen: (isOpen: boolean) => set({ isWalletOpen: isOpen }),
  setIsOnrampActive: (isOnrampActive: boolean) => set({ isWalletOnrampActive: isOnrampActive }),
  setIsFilteredUserPositions: (isFilteredUserPositions: boolean) =>
    set({ isFilteredUserPositions: isFilteredUserPositions }),
  setLendingMode: (lendingMode: LendingModes) =>
    set({
      lendingMode: lendingMode,
    }),
  setIsOraclesStale: (isOraclesStale: boolean) => set({ isOraclesStale: isOraclesStale }),
  setPoolFilter: (poolType: PoolTypes) => set({ poolFilter: poolType }),
  setSortOption: (sortOption: SortAssetOption) => set({ sortOption: sortOption }),
  setPriorityFee: (priorityFee: number) => set({ priorityFee: priorityFee }),
  setIsActionComplete: (isActionComplete: boolean) => set({ isActionComplete: isActionComplete }),
  setPreviousTxn: (previousTxn: PreviousTxn) => set({ previousTxn: previousTxn }),
  setIsActionBoxInputFocussed: (isFocussed: boolean) => set({ isActionBoxInputFocussed: isFocussed }),
  setAssetListSearch: (search: string) => set({ assetListSearch: search }),
});

export { createUiStore, SORT_OPTIONS_MAP };
export type { UiState };
