import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes, PreviousTxn } from "~/types";
import {
  MaxCap,
  MaxCapType,
  TransactionBroadcastType,
  TransactionPriorityType,
  TransactionSettings,
} from "@mrgnlabs/mrgn-common";
import { DEFAULT_PRIORITY_SETTINGS, fetchMaxCap, fetchPriorityFee } from "@mrgnlabs/mrgn-utils";
import { PriorityFees } from "@mrgnlabs/marginfi-client-v2";
import { Connection } from "@solana/web3.js";
import { defaultJupiterOptions, JupiterOptions } from "~/components";

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
  jupiterOptions: JupiterOptions;
  platformFeeBps: number;
  isActionComplete: boolean;
  previousTxn: PreviousTxn | null;
  isActionBoxInputFocussed: boolean;
  walletState: WalletState;
  isOnrampActive: boolean;
  broadcastType: TransactionBroadcastType;
  priorityType: TransactionPriorityType;
  maxCapType: MaxCapType;
  maxCap: MaxCap;
  priorityFees: PriorityFees;
  displaySettings: boolean;

  // Actions
  setIsWalletAuthDialogOpen: (isOpen: boolean) => void;
  setIsWalletOpen: (isOpen: boolean) => void;
  setLendingMode: (lendingMode: LendingModes) => void;
  setSlippageBps: (slippageBps: number) => void;
  setIsActionComplete: (isActionSuccess: boolean) => void;
  setJupiterOptions: (jupiterOptions: JupiterOptions) => void;
  setPreviousTxn: (previousTxn: PreviousTxn) => void;
  setWalletState: (walletState: WalletState) => void;
  setIsActionBoxInputFocussed: (isFocussed: boolean) => void;
  setIsOnrampActive: (isOnrampActive: boolean) => void;
  setTransactionSettings: (settings: TransactionSettings, connection: Connection) => void;
  fetchPriorityFee: (connection: Connection, settings?: TransactionSettings) => void;
  setDisplaySettings: (displaySettings: boolean) => void;
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
  priorityFees: {},
  ...DEFAULT_PRIORITY_SETTINGS,

  displaySettings: false,

  jupiterOptions: defaultJupiterOptions,

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
  setTransactionSettings: (settings: TransactionSettings, connection: Connection) => {
    const { broadcastType, priorityType, maxCapType } = settings;
    set({ broadcastType, priorityType, maxCapType });
    get().fetchPriorityFee(connection, settings);
  },
  fetchPriorityFee: async (connection: Connection, settings?: TransactionSettings) => {
    const { priorityType, broadcastType } = settings ?? get();
    const { maxCap } = get();

    const manualMaxCap = settings?.maxCap ?? maxCap.manualMaxCap;

    try {
      const { bundleTipCap, priorityFeeCap } = await fetchMaxCap(connection);
      const priorityFees = await fetchPriorityFee(broadcastType, priorityType, connection);
      set({
        priorityFees,
        maxCap: { manualMaxCap, bundleTipCap, priorityFeeCap },
      });
    } catch (error) {
      console.error(error);
    }
  },
  setDisplaySettings: (displaySettings: boolean) => set({ displaySettings: displaySettings }),
  setJupiterOptions: (jupiterOptions: JupiterOptions) =>
    set({ jupiterOptions: { ...jupiterOptions, slippageBps: jupiterOptions.slippageBps * 100 } }),
});

export { createUiStore };
export type { UiState };
