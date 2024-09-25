import { create, StateCreator } from "zustand";

import { QuoteResponse } from "@jup-ag/api";
import { VersionedTransaction } from "@solana/web3.js";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMethod } from "@mrgnlabs/mrgn-utils";

interface RepayCollatBoxState {
  // State
  amountRaw: string;
  maxAmountCollateral: number;
  repayAmount: number;

  actionMode: ActionType;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;

  simulationResult: SimulationResult | null;

  actionQuote: QuoteResponse | null;
  actionTxns: { actionTxn: VersionedTransaction | null; bundleTipTxn: VersionedTransaction | null };

  errorMessage: ActionMethod | null;
  isLoading: boolean;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  refreshSelectedBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: { requestedAction?: ActionType; requestedBank?: ExtendedBankInfo }) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setMaxAmountCollateral: (maxAmountCollateral: number) => void;
  setRepayAmount: (repayAmount: number) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;

  setActionQuote: (actionQuote: QuoteResponse | null) => void;
  setActionTxns: (actionTxns: {
    actionTxn: VersionedTransaction | null;
    bundleTipTxn: VersionedTransaction | null;
  }) => void;
  setErrorMessage: (errorMessage: ActionMethod | null) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedSecondaryBank: (bank: ExtendedBankInfo | null) => void;

  setIsLoading: (isLoading: boolean) => void;
}

function createRepayCollatBoxStore() {
  return create<RepayCollatBoxState>(stateCreator);
}

const initialState: RepayCollatBoxState = {
  amountRaw: "",
  repayAmount: 0,
  maxAmountCollateral: 0,
  actionMode: ActionType.RepayCollat,
  selectedBank: null,
  selectedSecondaryBank: null,
  simulationResult: null,
  actionQuote: null,
  actionTxns: { actionTxn: null, bundleTipTxn: null },
  errorMessage: null,
  isLoading: false,

  refreshState: () => {},
  refreshSelectedBanks: () => {},
  fetchActionBoxState: () => {},
  setAmountRaw: () => {},
  setRepayAmount: () => {},
  setMaxAmountCollateral: () => {},
  setSimulationResult: () => {},
  setActionQuote: () => {},
  setActionTxns: () => {},
  setErrorMessage: () => {},
  setSelectedBank: () => {},
  setSelectedSecondaryBank: () => {},
  setIsLoading: () => {},
} as RepayCollatBoxState;

const stateCreator: StateCreator<RepayCollatBoxState, [], []> = (set, get) => ({
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

    if (args.requestedAction) {
      requestedAction = args.requestedAction;
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

  setAmountRaw(amountRaw, maxAmount) {
    const prevAmountRaw = get().amountRaw;
    const isAmountChanged = amountRaw !== prevAmountRaw;

    if (isAmountChanged) {
      set({
        simulationResult: null,
        actionTxns: initialState.actionTxns,
        actionQuote: null,
        repayAmount: undefined,
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

  setActionQuote(actionQuote) {
    set({ actionQuote });
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
    const selectedBank = get().selectedBank;
    const selectedRepayBank = get().selectedSecondaryBank;

    if (selectedBank) {
      const updatedBank = banks.find((v) => v.address.equals(selectedBank.address));
      if (updatedBank) {
        set({ selectedBank: updatedBank });
      }
    }

    if (selectedRepayBank) {
      const updatedRepayBank = banks.find((v) => v.address.equals(selectedRepayBank.address));
      if (updatedRepayBank) {
        set({ selectedSecondaryBank: updatedRepayBank });
      }
    }
  },

  async setSelectedBank(tokenBank) {
    const selectedBank = get().selectedBank;
    const hasBankChanged = !tokenBank || !selectedBank || !tokenBank.address.equals(selectedBank.address);

    if (hasBankChanged) {
      set({
        selectedBank: tokenBank,
        amountRaw: "",
        repayAmount: undefined,
        selectedSecondaryBank: null,
        actionTxns: initialState.actionTxns,
        actionQuote: undefined,
        errorMessage: null,
      });
    }
  },

  async setSelectedSecondaryBank(secondaryBank) {
    const selectedSecondaryBank = get().selectedSecondaryBank;
    const hasBankChanged =
      !secondaryBank || !selectedSecondaryBank || !secondaryBank.address.equals(selectedSecondaryBank.address);

    if (hasBankChanged) {
      set({
        selectedSecondaryBank: secondaryBank,
        amountRaw: "",
        repayAmount: undefined,
        actionTxns: initialState.actionTxns,
        actionQuote: undefined,
        errorMessage: null,
      });
    } else {
      set({ selectedSecondaryBank: secondaryBank });
    }
  },
});

export { createRepayCollatBoxStore };
export type { RepayCollatBoxState };
