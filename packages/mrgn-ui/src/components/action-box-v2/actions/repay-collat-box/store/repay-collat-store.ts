import { create, StateCreator } from "zustand";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMessageType, RepayCollatActionTxns } from "@mrgnlabs/mrgn-utils";

interface RepayCollatBoxState {
  // State
  amountRaw: string;
  maxAmountCollateral: number;
  repayAmount: number;

  selectedDepositBank: ExtendedBankInfo | null;
  selectedBorrowBank: ExtendedBankInfo | null;

  simulationResult: SimulationResult | null;

  actionTxns: RepayCollatActionTxns;

  errorMessage: ActionMessageType | null;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  refreshSelectedBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: {
    requestedDepositBank?: ExtendedBankInfo;
    requestedBorrowBank?: ExtendedBankInfo;
  }) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setMaxAmountCollateral: (maxAmountCollateral: number) => void;
  setRepayAmount: (repayAmount: number) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;

  setActionTxns: (actionTxns: RepayCollatActionTxns) => void;
  setErrorMessage: (errorMessage: ActionMessageType | null) => void;
  setSelectedDepositBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedBorrowBank: (bank: ExtendedBankInfo | null) => void;
}

function createRepayCollatBoxStore() {
  return create<RepayCollatBoxState>(stateCreator);
}

const initialState = {
  amountRaw: "",
  repayAmount: 0,
  maxAmountCollateral: 0,
  selectedDepositBank: null,
  selectedBorrowBank: null,
  simulationResult: null,

  actionTxns: { actionTxn: null, additionalTxns: [], actionQuote: null, lastValidBlockHeight: undefined },
  errorMessage: null,
};

const stateCreator: StateCreator<RepayCollatBoxState, [], []> = (set, get) => ({
  // State
  ...initialState,

  refreshState(actionMode?: ActionType) {
    if (actionMode) {
      set({ ...initialState });
    } else {
      set({ ...initialState });
    }
  },

  fetchActionBoxState(args) {
    let requestedDepositBank: ExtendedBankInfo | null = null;
    let requestedBorrowBank: ExtendedBankInfo | null = null;

    if (args.requestedDepositBank) {
      requestedDepositBank = args.requestedDepositBank;
    } else {
      requestedDepositBank = null;
    }

    if (args.requestedBorrowBank) {
      requestedBorrowBank = args.requestedBorrowBank;
    } else {
      requestedBorrowBank = null;
    }

    const selectedDepositBank = get().selectedDepositBank;
    const selectedBorrowBank = get().selectedBorrowBank;

    const needRefresh =
      !selectedDepositBank ||
      !selectedBorrowBank ||
      (requestedDepositBank && !requestedDepositBank.address.equals(selectedDepositBank.address)) ||
      (requestedBorrowBank && !requestedBorrowBank.address.equals(selectedBorrowBank.address));

    if (needRefresh)
      set({ ...initialState, selectedDepositBank: requestedDepositBank, selectedBorrowBank: requestedBorrowBank });
  },

  setAmountRaw(amountRaw, maxAmount) {
    const prevAmountRaw = get().amountRaw;
    const isAmountChanged = amountRaw !== prevAmountRaw;

    if (isAmountChanged) {
      set({
        simulationResult: null,
        actionTxns: initialState.actionTxns,
        repayAmount: 0,
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

  setRepayAmount(repayAmount) {
    set({ repayAmount });
  },

  setSimulationResult(simulationResult) {
    set({ simulationResult });
  },

  setMaxAmountCollateral(maxAmountCollateral) {
    set({ maxAmountCollateral });
  },

  refreshSelectedBanks(banks: ExtendedBankInfo[]) {
    const selectedDepositBank = get().selectedDepositBank;
    const selectedBorrowBank = get().selectedBorrowBank;

    if (selectedDepositBank) {
      const updatedBank = banks.find((v) => v.address.equals(selectedDepositBank.address));
      if (updatedBank) {
        set({ selectedDepositBank: updatedBank });
      }
    }

    if (selectedBorrowBank) {
      const updatedBorrowBank = banks.find((v) => v.address.equals(selectedBorrowBank.address));
      if (updatedBorrowBank) {
        set({ selectedBorrowBank: updatedBorrowBank });
      }
    }
  },

  async setSelectedDepositBank(tokenBank) {
    const selectedBank = get().selectedDepositBank;
    const hasBankChanged = !tokenBank || !selectedBank || !tokenBank.address.equals(selectedBank.address);

    if (hasBankChanged) {
      set({
        selectedDepositBank: tokenBank,
        amountRaw: "",
        repayAmount: 0,
        selectedBorrowBank: null,
        actionTxns: initialState.actionTxns,
        errorMessage: null,
      });
    }
  },

  async setSelectedBorrowBank(secondaryBank) {
    const selectedBorrowBank = get().selectedBorrowBank;
    const hasBankChanged =
      !secondaryBank || !selectedBorrowBank || !secondaryBank.address.equals(selectedBorrowBank.address);

    if (hasBankChanged) {
      set({
        selectedBorrowBank: secondaryBank,
        amountRaw: "",
        repayAmount: undefined,
        actionTxns: initialState.actionTxns,
        errorMessage: null,
      });
    } else {
      set({ selectedBorrowBank: secondaryBank });
    }
  },
});

export { createRepayCollatBoxStore };
export type { RepayCollatBoxState, RepayCollatActionTxns };
