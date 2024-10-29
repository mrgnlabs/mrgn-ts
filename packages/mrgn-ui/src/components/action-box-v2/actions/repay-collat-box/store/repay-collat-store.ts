import { create, StateCreator } from "zustand";

import { QuoteResponse } from "@jup-ag/api";
import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMessageType, RepayCollatActionTxns } from "@mrgnlabs/mrgn-utils";

interface RepayCollatBoxState {
  // State
  amountRaw: string;
  maxAmountCollateral: number;
  repayAmount: number;

  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;

  simulationResult: SimulationResult | null;

  actionTxns: RepayCollatActionTxns;

  errorMessage: ActionMessageType | null;
  isLoading: boolean;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  refreshSelectedBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: { requestedBank?: ExtendedBankInfo }) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setMaxAmountCollateral: (maxAmountCollateral: number) => void;
  setRepayAmount: (repayAmount: number) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;

  setActionTxns: (actionTxns: RepayCollatActionTxns) => void;
  setErrorMessage: (errorMessage: ActionMessageType | null) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedSecondaryBank: (bank: ExtendedBankInfo | null) => void;

  setIsLoading: (isLoading: boolean) => void;
}

function createRepayCollatBoxStore() {
  return create<RepayCollatBoxState>(stateCreator);
}

const initialState = {
  amountRaw: "",
  repayAmount: 0,
  maxAmountCollateral: 0,
  selectedBank: null,
  selectedSecondaryBank: null,
  simulationResult: null,

  actionTxns: { actionTxn: null, additionalTxns: [], actionQuote: null, lastValidBlockHeight: undefined },
  errorMessage: null,
  isLoading: false,
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
    let requestedBank: ExtendedBankInfo | null = null;

    if (args.requestedBank) {
      requestedBank = args.requestedBank;
    } else {
      requestedBank = null;
    }

    const selectedBank = get().selectedBank;

    const needRefresh = !selectedBank || (requestedBank && !requestedBank.address.equals(selectedBank.address));

    if (needRefresh) set({ ...initialState, selectedBank: requestedBank });
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
        repayAmount: 0,
        selectedSecondaryBank: null,
        actionTxns: initialState.actionTxns,
        errorMessage: null,
      });
    }
  },

  setIsLoading(isLoading) {
    set({ isLoading });
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
        errorMessage: null,
      });
    } else {
      set({ selectedSecondaryBank: secondaryBank });
    }
  },
});

export { createRepayCollatBoxStore };
export type { RepayCollatBoxState, RepayCollatActionTxns };
