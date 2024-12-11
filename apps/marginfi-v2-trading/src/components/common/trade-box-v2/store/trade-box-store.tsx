import { ActionMessageType, calculateLstYield, LSTS_SOLANA_COMPASS_MAP } from "@mrgnlabs/mrgn-utils";

import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { LoopActionTxns } from "@mrgnlabs/mrgn-utils";
import { create, StateCreator } from "zustand";
import { TradeSide } from "..";
import { ArenaBank } from "~/store/tradeStoreV2";

interface TradeBoxState {
  // State
  amountRaw: string;
  tradeState: TradeSide;
  leverage: number;
  maxLeverage: number;

  depositLstApy: number | null;
  borrowLstApy: number | null;

  selectedBank: ArenaBank | null;
  selectedSecondaryBank: ArenaBank | null;

  simulationResult: SimulationResult | null;
  actionTxns: LoopActionTxns | null;

  errorMessage: ActionMessageType | null;

  // Actions
  refreshState: () => void;

  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setTradeState: (tradeState: TradeSide) => void;
  setLeverage: (leverage: number) => void;
  setSimulationResult: (result: SimulationResult | null) => void;
  setActionTxns: (actionTxns: LoopActionTxns | null) => void;
  setErrorMessage: (errorMessage: ActionMessageType | null) => void;
  setSelectedBank: (bank: ArenaBank | null) => void;
  setSelectedSecondaryBank: (bank: ArenaBank | null) => void;
  setMaxLeverage: (maxLeverage: number) => void;
  setDepositLstApy: (bank: ArenaBank) => void;
  setBorrowLstApy: (bank: ArenaBank) => void;
}

const initialState = {
  amountRaw: "",
  leverageAmount: 0,
  leverage: 1,
  simulationResult: null,
  actionTxns: null,
  errorMessage: null,
  selectedBank: null,
  selectedSecondaryBank: null,
  maxLeverage: 0,
  depositLstApy: null,
  borrowLstApy: null,
};

function createTradeBoxStore() {
  return create<TradeBoxState>(stateCreator);
}

const stateCreator: StateCreator<TradeBoxState, [], []> = (set, get) => ({
  // State
  ...initialState,
  tradeState: "long" as TradeSide,

  refreshState() {
    set(initialState);
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

  setActionTxns(actionTxns: LoopActionTxns | null) {
    set({ actionTxns: actionTxns });
  },

  setErrorMessage(errorMessage: ActionMessageType | null) {
    set({ errorMessage: errorMessage });
  },

  setSelectedBank(tokenBank) {
    const selectedBank = get().selectedBank;
    const hasBankChanged = !tokenBank || !selectedBank || !tokenBank.address.equals(selectedBank.address);

    if (hasBankChanged) {
      if (tokenBank) {
        get().setDepositLstApy(tokenBank);
      }
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
      if (secondaryBank) {
        get().setBorrowLstApy(secondaryBank);
      }
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

  async setDepositLstApy(bank: ArenaBank) {
    const lstsArr = Object.keys(LSTS_SOLANA_COMPASS_MAP);
    if (!lstsArr.includes(bank.meta.tokenSymbol)) {
      set({ depositLstApy: null });
      return;
    } else {
      const depositLstApy = await calculateLstYield(bank);
      set({ depositLstApy });
    }
  },

  async setBorrowLstApy(bank: ArenaBank) {
    const lstsArr = Object.keys(LSTS_SOLANA_COMPASS_MAP);
    if (!lstsArr.includes(bank.meta.tokenSymbol)) {
      set({ borrowLstApy: null });
      return;
    } else {
      const borrowLstApy = await calculateLstYield(bank);
      set({ borrowLstApy });
    }
  },
});

export { createTradeBoxStore };
export type { TradeBoxState };
