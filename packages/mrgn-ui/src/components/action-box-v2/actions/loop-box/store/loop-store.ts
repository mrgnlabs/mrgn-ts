import { create, StateCreator } from "zustand";
import BigNumber from "bignumber.js";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMessageType, calculateLstYield, LoopActionTxns, LSTS_SOLANA_COMPASS_MAP } from "@mrgnlabs/mrgn-utils";
interface LoopBoxState {
  // State
  amountRaw: string;

  leverage: number;
  maxLeverage: number;
  depositLstApy: number | null;
  borrowLstApy: number | null;

  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;

  simulationResult: SimulationResult | null;

  actionTxns: LoopActionTxns;

  errorMessage: ActionMessageType | null;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  refreshSelectedBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: { requestedBank?: ExtendedBankInfo }) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setLeverage: (leverage: number) => void;
  setMaxLeverage: (maxLeverage: number) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;

  setActionTxns: (actionTxns: LoopActionTxns) => void;
  setErrorMessage: (errorMessage: ActionMessageType | null) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedSecondaryBank: (bank: ExtendedBankInfo | null) => void;
  setDepositLstApy: (bank: ExtendedBankInfo) => void;
  setBorrowLstApy: (bank: ExtendedBankInfo) => void;
}

function createLoopBoxStore() {
  return create<LoopBoxState>(stateCreator);
}

const initialState = {
  amountRaw: "",
  leverage: 0,
  loopingAmounts: null,
  depositLstApy: null,
  borrowLstApy: null,
  maxLeverage: 0,
  selectedBank: null,
  selectedSecondaryBank: null,
  simulationResult: null,

  actionTxns: {
    transactions: [],
    actionQuote: null,
    actualDepositAmount: 0,
    borrowAmount: new BigNumber(0),
  },
  errorMessage: null,
};

const stateCreator: StateCreator<LoopBoxState, [], []> = (set, get) => ({
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
      const updatedScondaryBank = banks.find((v) => v.address.equals(selectedSecondaryBank.address));
      if (updatedScondaryBank) {
        set({ selectedSecondaryBank: updatedScondaryBank });
      }
    }
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
        amountRaw: "",
        selectedSecondaryBank: null,
        leverage: 0,
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
        amountRaw: "",
        leverage: 0,
        actionTxns: initialState.actionTxns,
        errorMessage: null,
      });
    } else {
      set({ selectedSecondaryBank: secondaryBank });
    }
  },

  async setDepositLstApy(bank: ExtendedBankInfo) {
    const lstsArr = Object.keys(LSTS_SOLANA_COMPASS_MAP);
    if (!lstsArr.includes(bank.meta.tokenSymbol)) {
      set({ depositLstApy: null });
      return;
    } else {
      const depositLstApy = await calculateLstYield(bank);
      set({ depositLstApy });
    }
  },

  async setBorrowLstApy(bank: ExtendedBankInfo) {
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

export { createLoopBoxStore };
export type { LoopBoxState };
