import { create, StateCreator } from "zustand";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes, PoolTypes, SortType, sortDirection, SortAssetOption, UserMode } from "~/types";
import { PublicKey } from "@solana/web3.js";

const SORT_OPTIONS_MAP: { [key in SortType]: SortAssetOption } = {
  APY_DESC: {
    label: "APY highest to lowest",
    borrowLabel: "APR highest to lowest",
    value: SortType.APY_DESC,
    field: "APY",
    direction: sortDirection.DESC,
  },
  APY_ASC: {
    label: "APY lowest to highest",
    borrowLabel: "APR lowest to highest",
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
  lendingMode: LendingModes;
  actionMode: ActionType;
  poolFilter: PoolTypes;
  sortOption: SortAssetOption;
  userMode: UserMode;
  selectedTokenBank: PublicKey | null;

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => void;
  setIsFetchingData: (isOpen: boolean) => void;
  setIsWalletAuthDialogOpen: (isOpen: boolean) => void;
  setIsWalletOpen: (isOpen: boolean) => void;
  setIsOnrampActive: (isOnrampActive: boolean) => void;
  setIsFilteredUserPositions: (isFilteredUserPositions: boolean) => void;
  setLendingMode: (lendingMode: LendingModes) => void;
  setActionMode: (actionMode: ActionType) => void;
  setPoolFilter: (poolType: PoolTypes) => void;
  setSortOption: (sortOption: SortAssetOption) => void;
  setUserMode: (userMode: UserMode) => void;
  setSelectedTokenBank: (selectedTokenBank: PublicKey | null) => void;
}

function createUiStore() {
  return create<UiState>(stateCreator);
}

const stateCreator: StateCreator<UiState, [], []> = (set, get) => ({
  // State
  isMenuDrawerOpen: false,
  isFetchingData: false,
  isWalletAuthDialogOpen: false,
  isWalletOpen: false,
  isWalletOnrampActive: false,
  isFilteredUserPositions: false,
  lendingMode: LendingModes.LEND,
  actionMode: ActionType.Deposit,
  poolFilter: PoolTypes.ALL,
  sortOption: SORT_OPTIONS_MAP[SortType.TVL_DESC],
  userMode: UserMode.LITE,
  selectedTokenBank: null,

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
      actionMode: lendingMode === LendingModes.LEND ? ActionType.Deposit : ActionType.Borrow,
    }),
  setActionMode: (actionMode: ActionType) => set({ actionMode: actionMode }),
  setPoolFilter: (poolType: PoolTypes) => set({ poolFilter: poolType }),
  setSortOption: (sortOption: SortAssetOption) => set({ sortOption: sortOption }),
  setUserMode: (userMode: UserMode) => set({ userMode: userMode }),
  setSelectedTokenBank: (selectedTokenBank: PublicKey | null) => set({ selectedTokenBank: selectedTokenBank }),
});

export { createUiStore, SORT_OPTIONS_MAP };
export type { UiState };
