import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import {
  MaxCapType,
  TransactionBroadcastType,
  TransactionPriorityType,
  TransactionSettings,
} from "@mrgnlabs/mrgn-common";
import { DEFAULT_PRIORITY_SETTINGS, fetchPriorityFee, JupiterOptions } from "@mrgnlabs/mrgn-utils";
import { PriorityFees } from "@mrgnlabs/marginfi-client-v2";
import { Connection } from "@solana/web3.js";
import { defaultJupiterOptions } from "~/components";

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
  jupiterOptions: JupiterOptions;
  platformFeeBps: number;
  isActionBoxInputFocussed: boolean;
  walletState: WalletState;
  isOnrampActive: boolean;
  broadcastType: TransactionBroadcastType;
  priorityType: TransactionPriorityType;
  maxCapType: MaxCapType;
  priorityFees: PriorityFees;
  displaySettings: boolean;

  // Actions
  setIsWalletAuthDialogOpen: (isOpen: boolean) => void;
  setIsWalletOpen: (isOpen: boolean) => void;
  setLendingMode: (lendingMode: LendingModes) => void;
  setJupiterOptions: (jupiterOptions: JupiterOptions) => void;
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
        if (
          state?.jupiterOptions.slippageBps &&
          (state.jupiterOptions.slippageBps < 0 || state.jupiterOptions.slippageBps > 500)
        ) {
          state.jupiterOptions.slippageBps = 100;
        }
      },
    })
  );
}

const stateCreator: StateCreator<UiState, [], []> = (set, get) => ({
  // State
  isWalletAuthDialogOpen: false,
  isWalletOpen: false,
  lendingMode: LendingModes.LEND,
  actionMode: ActionType.Deposit,
  platformFeeBps: 30,
  selectedTokenBank: null,
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
  setWalletState: (walletState: WalletState) => set({ walletState: walletState }),
  setIsActionBoxInputFocussed: (isFocussed: boolean) => set({ isActionBoxInputFocussed: isFocussed }),
  setIsOnrampActive: (isOnrampActive: boolean) => set({ isOnrampActive: isOnrampActive }),
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
  setDisplaySettings: (displaySettings: boolean) => set({ displaySettings: displaySettings }),
  setJupiterOptions: (jupiterOptions: JupiterOptions) => {
    set({ jupiterOptions: { ...jupiterOptions, slippageBps: jupiterOptions.slippageBps * 100 } });
  },
});

export { createUiStore };
export type { UiState };
