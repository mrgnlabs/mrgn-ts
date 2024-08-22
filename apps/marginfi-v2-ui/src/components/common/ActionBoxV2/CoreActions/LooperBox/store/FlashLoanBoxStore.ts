import { create, StateCreator } from "zustand";

import { QuoteResponse } from "@jup-ag/api";
import { VersionedTransaction } from "@solana/web3.js";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMethod } from "@mrgnlabs/mrgn-utils";

import BigNumber from "bignumber.js";

interface FlashLoanBoxState {
  // State
  amountRaw: string;
  maxAmountCollateral: number;
  repayAmount: number;
  loopingAmounts: {
    actualDepositAmount: number;
    borrowAmount: BigNumber;
  };

  leverage: number;
  maxLeverage: number;

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
  setLeverage: (leverage: number) => void;
  setMaxAmountCollateral: (maxAmountCollateral: number) => void;
  setRepayAmount: (repayAmount: number) => void;
  setLoopingAmounts: (loopingAmounts: { actualDepositAmount: number; borrowAmount: BigNumber }) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;

  setActionQuote: (actionQuote: QuoteResponse | null) => void;
  setActionTxns: (actionTxns: {
    actionTxn: VersionedTransaction | null;
    bundleTipTxn: VersionedTransaction | null;
  }) => void;
  setMaxLeverage: (maxLeverage: number) => void;
  setErrorMessage: (errorMessage: ActionMethod | null) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedSecondaryBank: (bank: ExtendedBankInfo | null) => void;

  setIsLoading: (isLoading: boolean) => void;
}

function createFlashLoanBoxStore() {
  return create<FlashLoanBoxState>(stateCreator);
}

const initialState: FlashLoanBoxState = {
  amountRaw: "",
  repayAmount: 0,
  loopingAmounts: {
    actualDepositAmount: 0,
    borrowAmount: new BigNumber(0),
  },
  maxAmountCollateral: 0,
  leverage: 0,
  maxLeverage: 0,
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
  setLeverage: () => {},
  setRepayAmount: () => {},
  setLoopingAmounts: () => {},
  setMaxAmountCollateral: () => {},
  setSimulationResult: () => {},
  setActionQuote: () => {},
  setActionTxns: () => {},
  setMaxLeverage: () => {},
  setErrorMessage: () => {},
  setSelectedBank: () => {},
  setSelectedSecondaryBank: () => {},
  setIsLoading: () => {},
} as FlashLoanBoxState;

const stateCreator: StateCreator<FlashLoanBoxState, [], []> = (set, get) => ({
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

  setLeverage(leverage) {
    const maxLeverage = get().maxLeverage;
    const prevLeverage = get().leverage;

    let newLeverage = leverage;

    const isLeverageChanged = prevLeverage !== newLeverage;

    if (maxLeverage && isLeverageChanged) {
      if (leverage > maxLeverage) {
        newLeverage = maxLeverage;
      }

      set({ leverage: newLeverage });
    }
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
        loopingAmounts: initialState.loopingAmounts,
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

  setLoopingAmounts(loopingAmounts) {
    set({ loopingAmounts });
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
        loopingAmounts: initialState.loopingAmounts,
        selectedSecondaryBank: null,
        leverage: 0,
        maxLeverage: 0,
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
        loopingAmounts: initialState.loopingAmounts,
        leverage: 0,
        maxLeverage: 0,
        actionTxns: initialState.actionTxns,
        actionQuote: undefined,
        errorMessage: null,
      });
    } else {
      set({ selectedSecondaryBank: secondaryBank });
    }
  },
});

export { createFlashLoanBoxStore };
export type { FlashLoanBoxState };
