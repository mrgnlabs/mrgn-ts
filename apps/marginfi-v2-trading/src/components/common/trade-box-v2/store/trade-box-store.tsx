import { ActionMessageType, TradeActionTxns } from "@mrgnlabs/mrgn-utils";
import BigNumber from "bignumber.js";

import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { create, StateCreator } from "zustand";
import { TradeSide } from "..";
import { ArenaBank } from "~/store/tradeStoreV2";

interface TradeBoxState {
  // State
  amountRaw: string;
  tradeState: TradeSide;
  leverage: number;
  maxLeverage: number;

  selectedBank: ArenaBank | null;
  selectedSecondaryBank: ArenaBank | null;

  simulationResult: SimulationResult | null;
  actionTxns: TradeActionTxns;

  errorMessage: ActionMessageType | null;

  // Actions
  refreshState: () => void;

  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setTradeState: (tradeState: TradeSide) => void;
  setLeverage: (leverage: number) => void;
  setSimulationResult: (result: SimulationResult | null) => void;
  setActionTxns: (actionTxns: TradeActionTxns) => void;
  setErrorMessage: (errorMessage: ActionMessageType | null) => void;
  setSelectedBank: (bank: ArenaBank | null) => void;
  setSelectedSecondaryBank: (bank: ArenaBank | null) => void;
  setMaxLeverage: (maxLeverage: number) => void;
}

const initialState = {
  amountRaw: "",
  leverageAmount: 0,
  leverage: 0,
  simulationResult: null,
  errorMessage: null,
  selectedBank: null,
  selectedSecondaryBank: null,
  maxLeverage: 0,

  actionTxns: {
    actionTxn: null,
    additionalTxns: [],
    actionQuote: null,
    lastValidBlockHeight: undefined,
    actualDepositAmount: 0,
    borrowAmount: new BigNumber(0),
  },
};

function createTradeBoxStore() {
  return create<TradeBoxState>(stateCreator);
}

const stateCreator: StateCreator<TradeBoxState, [], []> = (set, get) => ({
  // State
  ...initialState,
  tradeState: "long" as TradeSide,

  refreshState() {
    set({
      amountRaw: initialState.amountRaw,
      leverage: initialState.leverage,
      actionTxns: initialState.actionTxns,
      errorMessage: null,
    });
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

  setTradeState(tradeState: TradeSide) {
    set({ tradeState });
  },

  setLeverage(leverage: number) {
    set({ leverage });
  },

  setSimulationResult(result: SimulationResult | null) {
    set({ simulationResult: result });
  },

  setActionTxns(actionTxns: TradeActionTxns) {
    set({ actionTxns: actionTxns });
  },

  setErrorMessage(errorMessage: ActionMessageType | null) {
    set({ errorMessage: errorMessage });
  },

  setSelectedBank(tokenBank) {
    const selectedBank = get().selectedBank;
    const hasBankChanged = !tokenBank || !selectedBank || !tokenBank.address.equals(selectedBank.address);

    if (hasBankChanged) {
      set({
        selectedBank: tokenBank,
        amountRaw: initialState.amountRaw,
        leverage: initialState.leverage,
        actionTxns: initialState.actionTxns,
        errorMessage: null,
      });
    }
  },

  setSelectedSecondaryBank(secondaryBank) {
    const selectedSecondaryBank = get().selectedSecondaryBank;
    const hasBankChanged =
      !secondaryBank || !selectedSecondaryBank || !secondaryBank.address.equals(selectedSecondaryBank.address);

    if (hasBankChanged) {
      set({
        selectedSecondaryBank: secondaryBank,
        amountRaw: initialState.amountRaw,
        leverage: initialState.leverage,
        actionTxns: initialState.actionTxns,
        errorMessage: null,
      });
    } else {
      set({ selectedSecondaryBank: secondaryBank });
    }
  },

  setMaxLeverage(maxLeverage) {
    set({ maxLeverage });
  },
});

export { createTradeBoxStore };
export type { TradeBoxState };
