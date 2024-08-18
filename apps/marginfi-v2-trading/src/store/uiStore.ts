import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes, PreviousTxn } from "~/types";

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
  isWalletAuthDialogOpen: boolean;
  isWalletOpen: boolean;
  lendingMode: LendingModes;
  priorityFee: number;
  slippageBps: number;
  platformFeeBps: number;
  isActionComplete: boolean;
  previousTxn: PreviousTxn | null;
  isActionBoxInputFocussed: boolean;
  walletState: WalletState;
  isOnrampActive: boolean;

  // Actions
  setIsWalletAuthDialogOpen: (isOpen: boolean) => void;
  setIsWalletOpen: (isOpen: boolean) => void;
  setLendingMode: (lendingMode: LendingModes) => void;
  setPriorityFee: (priorityFee: number) => void;
  setSlippageBps: (slippageBps: number) => void;
  setIsActionComplete: (isActionSuccess: boolean) => void;
  setPreviousTxn: (previousTxn: PreviousTxn) => void;
  setWalletState: (walletState: WalletState) => void;
  setIsActionBoxInputFocussed: (isFocussed: boolean) => void;
  setIsOnrampActive: (isOnrampActive: boolean) => void;
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
  isWalletAuthDialogOpen: false,
  isWalletOpen: false,
  lendingMode: LendingModes.LEND,
  actionMode: ActionType.Deposit,
  platformFeeBps: 30,
  selectedTokenBank: null,
  priorityFee: 0,
  isActionComplete: false,
  previousTxn: null,
  isActionBoxInputFocussed: false,
  walletState: WalletState.DEFAULT,
  isOnrampActive: false,

  // Actions
  setIsWalletAuthDialogOpen: (isOpen: boolean) => set({ isWalletAuthDialogOpen: isOpen }),
  setIsWalletOpen: (isOpen: boolean) => set({ isWalletOpen: isOpen }),
  setLendingMode: (lendingMode: LendingModes) =>
    set({
      lendingMode: lendingMode,
    }),
  setPriorityFee: (priorityFee: number) => set({ priorityFee: priorityFee }),
  setSlippageBps: (slippageBps: number) => set({ slippageBps: slippageBps }),
  setIsActionComplete: (isActionComplete: boolean) => set({ isActionComplete: isActionComplete }),
  setPreviousTxn: (previousTxn: PreviousTxn) => set({ previousTxn: previousTxn }),
  setWalletState: (walletState: WalletState) => set({ walletState: walletState }),
  setIsActionBoxInputFocussed: (isFocussed: boolean) => set({ isActionBoxInputFocussed: isFocussed }),
  setIsOnrampActive: (isOnrampActive: boolean) => set({ isOnrampActive: isOnrampActive }),
});

export { createUiStore };
export type { UiState };
