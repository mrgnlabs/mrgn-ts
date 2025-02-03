import { create, StateCreator } from "zustand";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMessageType, RepayActionTxns } from "@mrgnlabs/mrgn-utils";

interface RepayBoxState {
  amountRaw: string;
  repayAmount: number;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  simulationResult: SimulationResult | null;
  actionTxns: RepayActionTxns;
  errorMessage: ActionMessageType | null;

  // Repay-collat specific
  maxAmountCollateral?: number | undefined;
  maxOverflowHit: boolean;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  refreshSelectedBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: { requestedBank?: ExtendedBankInfo; requestedSecondaryBank?: ExtendedBankInfo }) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setRepayAmount: (repayAmount: number) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;

  setActionTxns: (actionTxns: RepayActionTxns) => void;
  setErrorMessage: (errorMessage: ActionMessageType | null) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedSecondaryBank: (bank: ExtendedBankInfo | null) => void;

  // Repay-collat specific Actions
  setMaxAmountCollateral: (maxAmountCollateral?: number) => void;
  setMaxOverflowHit: (maxOverflowHit: boolean) => void;
}

function createRepayBoxStore() {
  return create<RepayBoxState>(stateCreator);
}

const initialState = {
  amountRaw: "",
  repayAmount: 0,
  selectedBank: null,
  selectedSecondaryBank: null,
  simulationResult: null,
  actionTxns: { actionTxn: null, additionalTxns: [], actionQuote: null, lastValidBlockHeight: undefined },
  errorMessage: null,

  maxAmountCollateral: undefined,
  maxOverflowHit: false,
};

const stateCreator: StateCreator<RepayBoxState, [], []> = (set, get) => ({
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
    let requestedSecondaryBank: ExtendedBankInfo | null = null;

    if (args.requestedBank) {
      requestedBank = args.requestedBank;
    } else {
      requestedBank = null;
    }

    if (args.requestedSecondaryBank) {
      requestedSecondaryBank = args.requestedSecondaryBank;
    } else if (args.requestedBank) {
      requestedSecondaryBank = args.requestedBank;
    } else {
      requestedSecondaryBank = null;
    }

    const selectedBank = get().selectedBank;
    const selectedSecondaryBank = get().selectedSecondaryBank;

    const needRefresh =
      !selectedBank ||
      !selectedSecondaryBank ||
      (requestedBank && !requestedBank.address.equals(selectedBank.address)) ||
      (requestedSecondaryBank && !requestedSecondaryBank.address.equals(selectedSecondaryBank.address));

    if (needRefresh)
      set({ ...initialState, selectedBank: requestedBank, selectedSecondaryBank: requestedSecondaryBank });
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
    const selectedSecondaryBank = get().selectedSecondaryBank;

    if (selectedBank) {
      const updatedBank = banks.find((v) => v.address.equals(selectedBank.address));
      if (updatedBank) {
        set({ selectedBank: updatedBank });
      }
    }

    if (selectedSecondaryBank) {
      const updatedSecondaryBank = banks.find((v) => v.address.equals(selectedSecondaryBank.address));
      if (updatedSecondaryBank) {
        set({ selectedSecondaryBank: updatedSecondaryBank });
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

  setMaxOverflowHit(maxOverflowHit) {
    set({ maxOverflowHit });
  },
});

export { createRepayBoxStore };
export type { RepayBoxState, RepayActionTxns };
