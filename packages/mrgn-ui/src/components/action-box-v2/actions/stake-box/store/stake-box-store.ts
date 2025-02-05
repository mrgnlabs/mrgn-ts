import { create, StateCreator } from "zustand";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMessageType, LstData, StakeActionTxns } from "@mrgnlabs/mrgn-utils";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";

interface StateBoxState {
  // State
  amountRaw: string;

  actionMode: ActionType;
  selectedBank: ExtendedBankInfo | null;

  simulationResult: SimulationResult | null;
  actionTxns: StakeActionTxns;

  errorMessage: ActionMessageType | null;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  refreshSelectedBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: { requestedLendType?: ActionType; requestedBank?: ExtendedBankInfo }) => void;
  setActionMode: (actionMode: ActionType) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: StakeActionTxns) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setErrorMessage: (errorMessage: ActionMessageType | null) => void;
}

function createStakeBoxStore() {
  return create<StateBoxState>(stateCreator);
}

const initialState = {
  amountRaw: "",
  simulationResult: null,
  actionMode: ActionType.MintLST,
  selectedBank: null,
  actionTxns: { transactions: [], actionQuote: null },
  errorMessage: null,
  lstData: null,
};

const stateCreator: StateCreator<StateBoxState, [], []> = (set, get) => ({
  // State
  ...initialState,

  refreshState(actionMode?: ActionType) {
    if (actionMode) {
      set({ ...initialState, actionMode });
    } else {
      set({ ...initialState });
    }
  },

  fetchActionBoxState(args) {
    let requestedAction: ActionType;
    let requestedBank: ExtendedBankInfo | null = null;
    const actionMode = get().actionMode;

    if (args.requestedLendType) {
      requestedAction = args.requestedLendType;
    } else {
      requestedAction = initialState.actionMode;
    }

    if (args.requestedBank) {
      requestedBank = args.requestedBank;
    } else {
      requestedBank = null;
    }

    const selectedBank = get().selectedBank;

    const needRefresh =
      !selectedBank ||
      !requestedAction ||
      actionMode !== requestedAction ||
      (requestedBank && !requestedBank.address.equals(selectedBank.address));

    if (needRefresh) set({ ...initialState, actionMode: requestedAction, selectedBank: requestedBank });
  },

  async setAmountRaw(amountRaw, maxAmount) {
    if (!maxAmount) {
      set({ amountRaw });
    } else {
      const strippedAmount = amountRaw.replace(/,/g, "");
      let amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
      const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 });

      if (amount && amount > maxAmount) {
        amount = maxAmount;
      }

      set({ amountRaw: numberFormatter.format(amount) });
    }
  },

  refreshSelectedBanks(banks: ExtendedBankInfo[]) {
    const selectedBank = get().selectedBank;

    if (selectedBank) {
      const updatedBank = banks.find((v) => v.address.equals(selectedBank.address));
      if (updatedBank) {
        set({ selectedBank: updatedBank });
      }
    }
  },

  setSelectedBank(tokenBank) {
    const selectedBank = get().selectedBank;
    const hasBankChanged = !tokenBank || !selectedBank || !tokenBank.address.equals(selectedBank.address);

    if (hasBankChanged) {
      set({
        selectedBank: tokenBank,
        amountRaw: "",
        errorMessage: null,
      });
    }
  },

  setActionMode(actionMode) {
    const selectedActionMode = get().actionMode;
    const hasActionModeChanged = !selectedActionMode || actionMode !== selectedActionMode;

    if (hasActionModeChanged) set({ amountRaw: "", errorMessage: null });

    set({ actionMode });
  },

  setActionTxns(actionTxns) {
    set({ actionTxns });
  },

  setSimulationResult(simulationResult) {
    set({ simulationResult });
  },

  setErrorMessage(errorMessage) {
    set({ errorMessage });
  },
});

export { createStakeBoxStore };
export type { StateBoxState };
