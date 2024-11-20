import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes, PreviousTxn } from "~/types";
import {
  MaxCapType,
  TransactionBroadcastType,
  TransactionPriorityType,
  TransactionSettings,
} from "@mrgnlabs/mrgn-common";
import { DEFAULT_PRIORITY_SETTINGS, fetchPriorityFee } from "@mrgnlabs/mrgn-utils";
import { PriorityFees } from "@mrgnlabs/marginfi-client-v2";
import { Connection } from "@solana/web3.js";

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
  slippageBps: number;
  platformFeeBps: number;
  isActionComplete: boolean;
  previousTxn: PreviousTxn | null;
  isActionBoxInputFocussed: boolean;
  walletState: WalletState;
  isOnrampActive: boolean;
  broadcastType: TransactionBroadcastType;
  priorityType: TransactionPriorityType;
  maxCapType: MaxCapType;
  maxCap: number;
  priorityFees: PriorityFees;

  // Actions
  setIsWalletAuthDialogOpen: (isOpen: boolean) => void;
  setIsWalletOpen: (isOpen: boolean) => void;
  setLendingMode: (lendingMode: LendingModes) => void;
  setSlippageBps: (slippageBps: number) => void;
  setIsActionComplete: (isActionSuccess: boolean) => void;
  setPreviousTxn: (previousTxn: PreviousTxn) => void;
  setWalletState: (walletState: WalletState) => void;
  setIsActionBoxInputFocussed: (isFocussed: boolean) => void;
  setIsOnrampActive: (isOnrampActive: boolean) => void;
  setTransactionSettings: (settings: TransactionSettings) => void;
  fetchPriorityFee: (connection: Connection) => void;
}

function createUiStore() {
  return create<UiState>()(
    persist(stateCreator, {
      name: "uiStore",
      onRehydrateStorage: () => (state) => {
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
  isActionComplete: false,
  previousTxn: null,
  isActionBoxInputFocussed: false,
  walletState: WalletState.DEFAULT,
  isOnrampActive: false,
  ...DEFAULT_PRIORITY_SETTINGS,
  priorityFees: {},

  // Actions
  setIsWalletAuthDialogOpen: (isOpen: boolean) => set({ isWalletAuthDialogOpen: isOpen }),
  setIsWalletOpen: (isOpen: boolean) => set({ isWalletOpen: isOpen }),
  setLendingMode: (lendingMode: LendingModes) =>
    set({
      lendingMode: lendingMode,
    }),
  setSlippageBps: (slippageBps: number) => set({ slippageBps: slippageBps }),
  setIsActionComplete: (isActionComplete: boolean) => set({ isActionComplete: isActionComplete }),
  setPreviousTxn: (previousTxn: PreviousTxn) => set({ previousTxn: previousTxn }),
  setWalletState: (walletState: WalletState) => set({ walletState: walletState }),
  setIsActionBoxInputFocussed: (isFocussed: boolean) => set({ isActionBoxInputFocussed: isFocussed }),
  setIsOnrampActive: (isOnrampActive: boolean) => set({ isOnrampActive: isOnrampActive }),
  setTransactionSettings: (settings: TransactionSettings) => set({ ...settings }),
  fetchPriorityFee: async (connection: Connection) => {
    const { maxCapType, maxCap, broadcastType, priorityType } = get();
    try {
      const priorityFees = await fetchPriorityFee(maxCapType, maxCap, broadcastType, priorityType, connection);
      set({ priorityFees });
    } catch (error) {
      console.error(error);
    }
  },
});

export { createUiStore };
export type { UiState };
