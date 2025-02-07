import { create, StateCreator } from "zustand";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMessageType, DepositSwapActionTxns } from "@mrgnlabs/mrgn-utils";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { WalletToken } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";

interface DepositSwapBoxState {
  // State
  amountRaw: string;

  lendMode: ActionType;
  selectedDepositBankPk: PublicKey | null;
  selectedSwapBankPk: PublicKey | null;

  simulationResult: SimulationResult | null;
  actionTxns: DepositSwapActionTxns;

  errorMessage: ActionMessageType | null;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  fetchActionBoxState: (args: {
    requestedLendType?: ActionType;
    depositBank?: ExtendedBankInfo;
    swapBank?: ExtendedBankInfo;
  }) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: DepositSwapActionTxns) => void;
  setErrorMessage: (errorMessage: ActionMessageType | null) => void;

  setSelectedDepositBankPk: (bankPk: PublicKey | null) => void;
  setSelectedSwapBankPk: (bankPk: PublicKey | null) => void;
}

function createDepositSwapBoxStore() {
  return create<DepositSwapBoxState>(stateCreator);
}

const initialState = {
  amountRaw: "",
  simulationResult: null,
  lendMode: ActionType.Deposit,
  actionTxns: { transactions: [], actionQuote: null },
  errorMessage: null,

  selectedDepositBankPk: null,
  selectedSwapBankPk: null,
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
    let requestedDepositBankPk: PublicKey | null = null;
    let requestedSwapBankPk: PublicKey | null = null;
    const lendMode = get().lendMode;

    if (args.requestedLendType) {
      requestedAction = args.requestedLendType;
    } else {
      requestedAction = initialState.lendMode;
    }

    if (args.depositBank) {
      requestedDepositBankPk = args.depositBank.address;
    } else {
      requestedDepositBankPk = null;
    }

    if (args.swapBank) {
      requestedSwapBankPk = args.swapBank.address;
    } else {
      requestedSwapBankPk = null;
    }

    const depositBankPk = get().selectedDepositBankPk;
    const swapBankPk = get().selectedSwapBankPk;

    const needRefresh =
      !depositBankPk ||
      !swapBankPk ||
      !requestedAction ||
      lendMode !== requestedAction ||
      (requestedDepositBankPk && !requestedDepositBankPk.equals(depositBankPk)) ||
      (requestedSwapBankPk && !requestedSwapBankPk.equals(swapBankPk));

    if (needRefresh)
      set({
        ...initialState,
        lendMode: requestedAction,
        selectedDepositBankPk: requestedDepositBankPk,
        selectedSwapBankPk: requestedSwapBankPk,
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

  setActionTxns(actionTxns) {
    set({ actionTxns });
  },

  setSimulationResult(simulationResult) {
    set({ simulationResult });
  },

  setErrorMessage(errorMessage) {
    set({ errorMessage });
  },

  setSelectedDepositBankPk(bankPk) {
    set({
      selectedDepositBankPk: bankPk,
    });
  },

  setSelectedSwapBankPk(bankPk) {
    set({
      selectedSwapBankPk: bankPk,
      amountRaw: "",
    });
  },
});

export { createDepositSwapBoxStore };
export type { DepositSwapBoxState };
