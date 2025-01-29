import { create, StateCreator } from "zustand";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMessageType, DepositSwapActionTxns } from "@mrgnlabs/mrgn-utils";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { WalletToken } from "@mrgnlabs/mrgn-common";

interface DepositSwapBoxState {
  // State
  amountRaw: string;

  lendMode: ActionType;
  selectedDepositBank: ExtendedBankInfo | null;
  selectedSwapBank: ExtendedBankInfo | WalletToken | null;

  simulationResult: SimulationResult | null;
  actionTxns: DepositSwapActionTxns;

  errorMessage: ActionMessageType | null;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  refreshBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: {
    requestedLendType?: ActionType;
    depositBank?: ExtendedBankInfo;
    swapBank?: ExtendedBankInfo;
  }) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: DepositSwapActionTxns) => void;
  setSelectedDepositBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedSwapBank: (bank: ExtendedBankInfo | WalletToken | null) => void;
  setErrorMessage: (errorMessage: ActionMessageType | null) => void;
}

function createDepositSwapBoxStore() {
  return create<DepositSwapBoxState>(stateCreator);
}

const initialState = {
  amountRaw: "",
  simulationResult: null,
  lendMode: ActionType.Deposit,
  selectedDepositBank: null,
  selectedSwapBank: null,
  actionTxns: { actionTxn: null, additionalTxns: [], actionQuote: null },
  errorMessage: null,
};

const stateCreator: StateCreator<DepositSwapBoxState, [], []> = (set, get) => ({
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
    let requestedDepositBank: ExtendedBankInfo | null = null;
    let requestedSwapBank: ExtendedBankInfo | null = null;
    const lendMode = get().lendMode;

    if (args.requestedLendType) {
      requestedAction = args.requestedLendType;
    } else {
      requestedAction = initialState.lendMode;
    }

    if (args.depositBank) {
      requestedDepositBank = args.depositBank;
    } else {
      requestedDepositBank = null;
    }

    if (args.swapBank) {
      requestedSwapBank = args.swapBank;
    } else {
      requestedSwapBank = null;
    }

    const depositBank = get().selectedDepositBank;
    const swapBank = get().selectedSwapBank;

    const needRefresh =
      !depositBank ||
      !swapBank ||
      !requestedAction ||
      lendMode !== requestedAction ||
      (requestedDepositBank && !requestedDepositBank.address.equals(depositBank.address)) ||
      (requestedSwapBank && !requestedSwapBank.address.equals(swapBank.address));

    if (needRefresh)
      set({
        ...initialState,
        lendMode: requestedAction,
        selectedDepositBank: requestedDepositBank,
        selectedSwapBank: requestedSwapBank,
      });
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

  refreshBanks(banks: ExtendedBankInfo[]) {
    const depositBank = get().selectedDepositBank;
    const swapBank = get().selectedSwapBank;

    if (depositBank) {
      const updatedBank = banks.find((v) => v.address.equals(depositBank.address));
      if (updatedBank) {
        set({ selectedDepositBank: updatedBank });
      }
    }

    if (swapBank) {
      const updatedBank = banks.find((v) => v.address.equals(swapBank.address));
      if (updatedBank) {
        set({ selectedSwapBank: updatedBank });
      }
    }
  },

  setSelectedDepositBank(depositBank) {
    const selectedBank = get().selectedDepositBank;
    const hasBankChanged = !depositBank || !selectedBank || !depositBank.address.equals(selectedBank.address);

    if (hasBankChanged) {
      set({
        selectedDepositBank: depositBank,
        // amountRaw: "", // TODO: will this mess up something?
        errorMessage: null,
      });
    }
  },

  setSelectedSwapBank(swapBank) {
    const selectedBank = get().selectedSwapBank;
    const hasBankChanged = !swapBank || !selectedBank || !swapBank.address.equals(selectedBank.address);

    if (hasBankChanged) {
      set({
        selectedSwapBank: swapBank,
        amountRaw: "",
        errorMessage: null,
      });
    }
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

export { createDepositSwapBoxStore };
export type { DepositSwapBoxState };
