import { create, StateCreator } from "zustand";
import BigNumber from "bignumber.js";

import { ActionMessageType, TradeActionTxns } from "@mrgnlabs/mrgn-utils";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";

import { ArenaBank } from "~/types/trade-store.types";

import { TradeSide } from "..";
import { PublicKey } from "@solana/web3.js";

interface TradeBoxState {
  // State
  amountRaw: string;
  tradeState: TradeSide;
  leverage: number;
  maxLeverage: number;

  selectedBankPk: PublicKey | null;
  selectedSecondaryBankPk: PublicKey | null;

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
  setSelectedBankPk: (bankAddress: PublicKey | null) => void;
  setSelectedSecondaryBankPk: (bankAddress: PublicKey | null) => void;
  setMaxLeverage: (maxLeverage: number) => void;
}

const initialState = {
  amountRaw: "",
  leverageAmount: 0,
  leverage: 0,
  simulationResult: null,
  errorMessage: null,
  selectedBankPk: null,
  selectedSecondaryBankPk: null,
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
    const prevLeverage = get().leverage;
    const isLeverageChanged = leverage !== prevLeverage;

    if (isLeverageChanged) {
      set({
        simulationResult: null,
        actionTxns: initialState.actionTxns,
        errorMessage: null,
      });
    }

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

  setSelectedBankPk(bankAddress) {
    const selectedBankPk = get().selectedBankPk;
    const hasBankChanged = !bankAddress || !selectedBankPk || !bankAddress.equals(selectedBankPk);

    if (hasBankChanged) {
      set({
        selectedBankPk: bankAddress,
        amountRaw: initialState.amountRaw,
        leverage: initialState.leverage,
        actionTxns: initialState.actionTxns,
        errorMessage: null,
      });
    }
  },

  setSelectedSecondaryBankPk(bankAddress) {
    const selectedSecondaryBankPk = get().selectedSecondaryBankPk;
    const hasBankChanged = !bankAddress || !selectedSecondaryBankPk || !bankAddress.equals(selectedSecondaryBankPk);

    if (hasBankChanged) {
      set({
        selectedSecondaryBankPk: bankAddress,
        amountRaw: initialState.amountRaw,
        leverage: initialState.leverage,
        actionTxns: initialState.actionTxns,
        errorMessage: null,
      });
    } else {
      set({ selectedSecondaryBankPk: bankAddress });
    }
  },

  setMaxLeverage(maxLeverage) {
    set({ maxLeverage });
  },
});

export { createTradeBoxStore };
export type { TradeBoxState };
