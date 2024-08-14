import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes, PoolTypes, PreviousTxn } from "~/types";

export enum WalletState {
  DEFAULT = "default",
  TOKEN = "token",
  SEND = "send",
  SELECT = "select",
  SWAP = "swap",
  BRIDGE = "bridge",
  BUY = "buy",
}

interface UiState {
  // State
  isMenuDrawerOpen: boolean;
  isFetchingData: boolean;
  isWalletAuthDialogOpen: boolean;
  isWalletOpen: boolean;
  isWalletOnrampActive: boolean;
  isFilteredUserPositions: boolean;
  lendingMode: LendingModes;
  poolFilter: PoolTypes;
  priorityFee: number;
  slippageBps: number;
  platformFeeBps: number;
  isActionComplete: boolean;
  previousTxn: PreviousTxn | null;
  isActionBoxInputFocussed: boolean;
  assetListSearch: string;
  walletState: WalletState;

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => void;
  setIsFetchingData: (isOpen: boolean) => void;
  setIsWalletAuthDialogOpen: (isOpen: boolean) => void;
  setIsWalletOpen: (isOpen: boolean) => void;
  setIsOnrampActive: (isOnrampActive: boolean) => void;
  setIsFilteredUserPositions: (isFilteredUserPositions: boolean) => void;
  setLendingMode: (lendingMode: LendingModes) => void;
  setPoolFilter: (poolType: PoolTypes) => void;
  setPriorityFee: (priorityFee: number) => void;
  setSlippageBps: (slippageBps: number) => void;
  setIsActionComplete: (isActionSuccess: boolean) => void;
  setPreviousTxn: (previousTxn: PreviousTxn) => void;
  setIsActionBoxInputFocussed: (isFocussed: boolean) => void;
  setAssetListSearch: (search: string) => void;
  setWalletState: (walletState: WalletState) => void;
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
      },
    })
  );
}

const stateCreator: StateCreator<UiState, [], []> = (set, get) => ({
  // State
  slippageBps: 100,
  isMenuDrawerOpen: false,
  isFetchingData: false,
  isWalletAuthDialogOpen: false,
  isWalletOpen: false,
  isWalletOnrampActive: false,
  isFilteredUserPositions: false,
  lendingMode: LendingModes.LEND,
  actionMode: ActionType.Deposit,
  poolFilter: PoolTypes.ALL,
  platformFeeBps: 30,
  selectedTokenBank: null,
  priorityFee: 0,
  isActionComplete: false,
  previousTxn: null,
  isActionBoxInputFocussed: false,
  assetListSearch: "",
  walletState: WalletState.DEFAULT,

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
  setPoolFilter: (poolType: PoolTypes) => set({ poolFilter: poolType }),
  setPriorityFee: (priorityFee: number) => set({ priorityFee: priorityFee }),
  setSlippageBps: (slippageBps: number) => set({ slippageBps: slippageBps }),
  setIsActionComplete: (isActionComplete: boolean) => set({ isActionComplete: isActionComplete }),
  setPreviousTxn: (previousTxn: PreviousTxn) => set({ previousTxn: previousTxn }),
  setIsActionBoxInputFocussed: (isFocussed: boolean) => set({ isActionBoxInputFocussed: isFocussed }),
  setAssetListSearch: (search: string) => set({ assetListSearch: search }),
  setWalletState: (walletState: WalletState) => set({ walletState: walletState }),
});

export { createUiStore };
export type { UiState };
