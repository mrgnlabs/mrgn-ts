import { create, StateCreator } from "zustand";
import BigNumber from "bignumber.js";

import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMessageType, LoopActionTxns } from "@mrgnlabs/mrgn-utils";

interface AddPositionBoxState {
  // State
  amountRaw: string;
  leverage: number;
  maxLeverage: number;

  simulationResult: SimulationResult | null;
  actionTxns: LoopActionTxns;
  errorMessage: ActionMessageType | null;

  // Actions
  refreshState: () => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setLeverage: (leverage: number) => void;
  setMaxLeverage: (maxLeverage: number) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;

  setActionTxns: (actionTxns: LoopActionTxns) => void;
  setErrorMessage: (errorMessage: ActionMessageType | null) => void;
}

function createAddPositionBoxStore() {
  return create<AddPositionBoxState>(stateCreator);
}

const initialState = {
  amountRaw: "",
  leverage: 1,
  maxLeverage: 0,
  selectedBank: null,
  simulationResult: null,

  actionTxns: {
    transactions: [],
    actionQuote: null,
    actualDepositAmount: 0,
    borrowAmount: new BigNumber(0),
  },
  errorMessage: null,
};

const stateCreator: StateCreator<AddPositionBoxState, [], []> = (set, get) => ({
  // State
  ...initialState,

  refreshState() {
    set({ ...initialState });
  },

  setAmountRaw(amountRaw, maxAmount) {
    const prevAmountRaw = get().amountRaw;
    const isAmountChanged = amountRaw !== prevAmountRaw;

    if (isAmountChanged) {
      set({
        simulationResult: null,
        actionTxns: initialState.actionTxns,
        errorMessage: null,
      });
    }

    if (!maxAmount) {
      set({ amountRaw });
    } else {
      const strippedAmount = amountRaw.replace(/,/g, "");
      const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
      const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 });

      if (amount && amount > maxAmount) {
        set({ amountRaw: numberFormatter.format(maxAmount) });
      } else {
        set({ amountRaw: numberFormatter.format(amount) });
      }
    }
  },

  setActionTxns(actionTxns) {
    set({ actionTxns });
  },

  setErrorMessage(errorMessage) {
    set({ errorMessage });
  },

  setLeverage(leverage) {
    set({ leverage });
  },

  setMaxLeverage(maxLeverage) {
    set({ maxLeverage });
  },

  setSimulationResult(simulationResult) {
    set({ simulationResult });
  },
});

export { createAddPositionBoxStore };
export type { AddPositionBoxState };
