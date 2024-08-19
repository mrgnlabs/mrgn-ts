import { create, StateCreator } from "zustand";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMethod } from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { ActionSummary } from "../utils";

interface LendBoxState {
  // State
  amountRaw: string;
  lendMode: ActionType;
  actionSummary: ActionSummary | null;
  selectedBank: ExtendedBankInfo | null;
  selectedAccount: MarginfiAccountWrapper | null;
  errorMessage: ActionMethod | null;
  isLoading: boolean;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  refreshSelectedBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: { requestedLendType?: ActionType; requestedBank?: ExtendedBankInfo }) => void;
  setLendMode: (lendMode: ActionType) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedAccount: (selectedAccount: MarginfiAccountWrapper | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

function createLendBoxStore() {
  return create<LendBoxState>(stateCreator);
}

const initialState = {
  amountRaw: "",
  actionSummary: null,
  errorMessage: null,
  lendMode: ActionType.Deposit,
  selectedBank: null,
  selectedAccount: null,
  isLoading: false,
};

const stateCreator: StateCreator<LendBoxState, [], []> = (set, get) => ({
  // State
  ...initialState,

  refreshState(lendMode?: ActionType) {
    if (lendMode) {
      set({ ...initialState, lendMode });
    } else {
      set({ ...initialState });
    }
  },

  fetchActionBoxState(args) {
    let requestedAction: ActionType;
    let requestedBank: ExtendedBankInfo | null = null;
    const lendMode = get().lendMode;

    if (args.requestedLendType) {
      requestedAction = args.requestedLendType;
    } else {
      requestedAction = initialState.lendMode;
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
      lendMode !== requestedAction ||
      (requestedBank && !requestedBank.address.equals(selectedBank.address));

    if (needRefresh) set({ ...initialState, lendMode: requestedAction, selectedBank: requestedBank });
  },

  setAmountRaw(amountRaw, maxAmount) {
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

  setSelectedAccount(selectedAccount) {
    set({ selectedAccount: selectedAccount });
  },

  setLendMode(lendMode) {
    const selectedActionMode = get().lendMode;
    const hasActionModeChanged = !selectedActionMode || lendMode !== selectedActionMode;

    if (hasActionModeChanged) set({ amountRaw: "", errorMessage: null });

    set({ lendMode });
  },

  setIsLoading(isLoading) {
    set({ isLoading });
  },
});

export { createLendBoxStore };
export type { LendBoxState };
