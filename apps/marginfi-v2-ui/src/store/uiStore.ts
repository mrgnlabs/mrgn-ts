import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";
import { Connection, PublicKey } from "@solana/web3.js";

import {
  MaxCapType,
  TransactionBroadcastType,
  TransactionPriorityType,
  TransactionSettings,
} from "@mrgnlabs/mrgn-common";
import {
  LendingModes,
  PoolTypes,
  DEFAULT_PRIORITY_SETTINGS,
  fetchPriorityFee,
  JupiterOptions,
} from "@mrgnlabs/mrgn-utils";
import { PriorityFees } from "@mrgnlabs/marginfi-client-v2";
import { ActionType } from "@mrgnlabs/mrgn-state";

import { defaultJupiterOptions } from "~/components";

type GlobalActionBoxProps = {
  isOpen: boolean;
  actionType: ActionType;
};

export enum TokenFilters {
  ALL = "all",
  STABLE = "stable",
  LST = "lst",
  MEME = "meme",
}

interface UiState {
  // State
  isMenuDrawerOpen: boolean;
  isFetchingData: boolean;
  isFilteredUserPositions: boolean;
  isOraclesStale: boolean;
  lendingMode: LendingModes;
  poolFilter: PoolTypes;
  tokenFilter: TokenFilters;
  assetListSearch: string;
  broadcastType: TransactionBroadcastType;
  priorityType: TransactionPriorityType;
  maxCapType: MaxCapType;
  priorityFees: PriorityFees;
  displaySettings: boolean;
  jupiterOptions: JupiterOptions;
  globalActionBoxProps: GlobalActionBoxProps;

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => void;
  setIsFetchingData: (isOpen: boolean) => void;
  setIsFilteredUserPositions: (isFilteredUserPositions: boolean) => void;
  setIsOraclesStale: (isOraclesStale: boolean) => void;
  setLendingMode: (lendingMode: LendingModes) => void;
  setPoolFilter: (poolType: PoolTypes) => void;
  setTokenFilter: (tokenFilter: TokenFilters) => void;
  setAssetListSearch: (search: string) => void;
  setTransactionSettings: (settings: TransactionSettings, connection: Connection) => void;
  fetchPriorityFee: (connection: Connection, settings?: TransactionSettings) => void;
  setDisplaySettings: (displaySettings: boolean) => void;
  setJupiterOptions: (jupiterOptions: JupiterOptions) => void;
  setGlobalActionBoxProps: (props: GlobalActionBoxProps) => void;
}

function createUiStore() {
  return create<UiState>()(
    persist(stateCreator, {
      name: "uiStore",
      onRehydrateStorage: () => (state) => {
        if (state?.broadcastType === "BUNDLE") {
          state.broadcastType = "DYNAMIC";
        }
        if (
          state?.jupiterOptions.slippageBps &&
          (state.jupiterOptions.slippageBps < 0 || state.jupiterOptions.slippageBps > 500)
        ) {
          state.jupiterOptions.slippageBps = 100;
        }

        if (state?.jupiterOptions && !state.jupiterOptions.configParams) {
          state.jupiterOptions.configParams = { basePath: "/api/jupiter/swap/v1" };
        }

        if (state?.globalActionBoxProps) {
          state.globalActionBoxProps = {
            isOpen: false,
            actionType: ActionType.Deposit,
          };
        } // Rehydrating this to ensure the global action box doesnt open on render

        // "all" is an old value set to "global"
        if (state?.poolFilter === PoolTypes.ALL) {
          state.poolFilter = PoolTypes.GLOBAL;
        }
      },
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
  poolFilter: PoolTypes.GLOBAL,
  tokenFilter: TokenFilters.ALL,
  assetListSearch: "",
  priorityFees: {},
  ...DEFAULT_PRIORITY_SETTINGS,
  displaySettings: false,
  jupiterOptions: defaultJupiterOptions,
  globalActionBoxProps: {
    isOpen: false,
    actionType: ActionType.Deposit,
  },

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
  setPoolFilter: (poolType: PoolTypes) => {
    // force lend mode for native stake
    if (poolType === PoolTypes.NATIVE_STAKE) {
      set({ lendingMode: LendingModes.LEND });
    }
    set({ poolFilter: poolType });
  },
  setTokenFilter: (tokenFilter: TokenFilters) => set({ tokenFilter }),
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
  setDisplaySettings: (displaySettings: boolean) => set({ displaySettings }),
  setJupiterOptions: (jupiterOptions: JupiterOptions) => {
    set({ jupiterOptions: { ...jupiterOptions, slippageBps: jupiterOptions.slippageBps * 100 } });
  },
  setGlobalActionBoxProps: (props) => {
    set({ globalActionBoxProps: props });
  },
});

export { createUiStore };
export type { UiState };
