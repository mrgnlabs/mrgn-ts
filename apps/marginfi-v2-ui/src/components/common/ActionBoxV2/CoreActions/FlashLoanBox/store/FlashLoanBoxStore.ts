import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { QuoteResponse } from "@jup-ag/api";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import * as solanaStakePool from "@solana/spl-stake-pool";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { computeMaxLeverage, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActionMethod, debounceFn, LoopingObject, LstType, RepayType, YbxType } from "@mrgnlabs/mrgn-utils";
import {
  STATIC_SIMULATION_ERRORS,
  DYNAMIC_SIMULATION_ERRORS,
  calculateLoopingParams,
  calculateRepayCollateralParams,
  calculateMaxRepayableCollateral,
} from "@mrgnlabs/mrgn-utils";

import { StakeData, capture } from "~/utils";
import BigNumber from "bignumber.js";

interface FlashLoanBoxState {
  // State
  amountRaw: string;
  repayAmountRaw: string;
  maxAmountCollat: number;
  loopingAmounts: {
    actualDepositAmount: number;
    borrowAmount: BigNumber;
  };

  leverage: number;
  maxLeverage: number;

  actionMode: ActionType;

  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;

  actionQuote: QuoteResponse | null;
  actionTxns: { actionTxn: VersionedTransaction | null; bundleTipTxn: VersionedTransaction | null };

  errorMessage: ActionMethod | null;
  isLoading: boolean;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  refreshSelectedBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: { requestedAction?: ActionType; requestedBank?: ExtendedBankInfo }) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setLeverage: (
    leverage: number,
    marginfiAccount: MarginfiAccountWrapper | null,
    connection: Connection,
    priorityFee: number,
    slippageBps: number
  ) => void;
  setLoopingAmountRaw: (
    marginfiAccount: MarginfiAccountWrapper,
    amountRaw: string,
    connection: Connection,
    maxAmount?: number
  ) => void;
  setRepayAmountRaw: (
    marginfiAccount: MarginfiAccountWrapper,
    repayAmountRaw: string,
    connection: Connection,
    priorityFee: number,
    slippageBps: number
  ) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setRepayBank: (bank: ExtendedBankInfo | null, slippageBps: number) => void;
  setSelectedStakingAccount: (account: StakeData) => void;
  setRepayCollateral: (
    marginfiAccount: MarginfiAccountWrapper,
    selectedBank: ExtendedBankInfo,
    selectedRepayBank: ExtendedBankInfo,
    amount: number,
    connection: Connection,
    priorityFee: number,
    slippageBps: number
  ) => void;
  setLooping: ({
    marginfiAccount,
    selectedBank,
    selectedLoopingBank,
    amount,
    slippageBps,
    connection,
    leverage,
    priorityFee,
  }: {
    marginfiAccount: MarginfiAccountWrapper;
    selectedBank?: ExtendedBankInfo;
    selectedLoopingBank?: ExtendedBankInfo;
    amount?: number;
    slippageBps: number;
    connection?: Connection;
    leverage?: number;
    priorityFee: number;
  }) => void;
  setIsLoading: (isLoading: boolean) => void;
}

function createFlashLoanBoxStore() {
  return create<FlashLoanBoxState>(stateCreator);
}

const initialState: FlashLoanBoxState = {
  amountRaw: "",
  repayAmountRaw: "",
  maxAmountCollat: 0,
  errorMessage: null,

  leverage: 0,
  maxLeverage: 0,
  loopingAmounts: {
    actualDepositAmount: 0,
    borrowAmount: new BigNumber(0),
  },

  actionMode: ActionType.Deposit,

  selectedBank: null,
  selectedSecondaryBank: null,

  actionQuote: null,
  actionTxns: { actionTxn: null, bundleTipTxn: null },

  isLoading: false,

  refreshState: () => {},
  refreshSelectedBanks: () => {},
  fetchActionBoxState: () => {},
  setAmountRaw: () => {},
  setLoopingAmountRaw: () => {},
  setRepayAmountRaw: () => {},
  setSelectedBank: () => {},
  setRepayBank: () => {},
  setSelectedStakingAccount: () => {},
  setRepayCollateral: () => {},
  setLooping: () => {},
  setIsLoading: () => {},
  setLeverage: () => {},
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

  setLeverage(leverage, marginfiAccount, connection, priorityFee, slippageBps) {
    const maxLeverage = get().maxLeverage;
    const prevLeverage = get().leverage;

    let newLeverage = leverage;

    const isLeverageChanged = prevLeverage !== newLeverage;

    if (maxLeverage && isLeverageChanged) {
      if (leverage > maxLeverage) {
        newLeverage = maxLeverage;
      }

      set({ leverage: newLeverage });

      if (marginfiAccount && connection) {
        get().setLooping({ marginfiAccount, connection, leverage: newLeverage, priorityFee, slippageBps });
      }
    }
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

  setLoopingAmountRaw(marginfiAccount, amountRaw, connection, maxAmount) {
    const prevAmountRaw = get().amountRaw;
    const isAmountChanged = amountRaw !== prevAmountRaw;

    if (isAmountChanged) {
      set({
        amountRaw,
        actionTxns: initialState.actionTxns,
        actionQuote: null,
        loopingAmounts: undefined,
        errorMessage: null,
      });
    }
  },

  setRepayAmountRaw(marginfiAccount, amountRaw, connection, priorityFee, slippageBps) {
    const strippedAmount = amountRaw.replace(/,/g, "");
    const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

    const selectedBank = get().selectedBank;
    const selectedRepayBank = get().selectedSecondaryBank;

    set({ repayAmountRaw: amountRaw });

    if (selectedBank && selectedRepayBank && connection) {
      const setCollat = debounceFn(get().setRepayCollateral, 500);
      setCollat(marginfiAccount, selectedBank, selectedRepayBank, amount, slippageBps, connection, priorityFee);
    }
  },

  async setLooping({
    marginfiAccount,
    selectedBank: selectedBankParam,
    selectedLoopingBank: selectedLoopingBankParam,
    amount: amountParam,
    slippageBps: slippageBpsParam,
    connection,
    leverage: selectedLeverageParam,
    priorityFee,
  }) {
    const {
      selectedBank: selectedBankStore,
      selectedSecondaryBank: selectedLoopingBankStore,
      amountRaw,
      leverage: leverageStore,
    } = get();
    const strippedAmount = amountRaw.replace(/,/g, "");
    const amountStore = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

    const leverage = selectedLeverageParam ?? leverageStore;
    const selectedBank = selectedBankParam ?? selectedBankStore;
    const selectedLoopingBank = selectedLoopingBankParam ?? selectedLoopingBankStore;
    const amount = amountParam ?? amountStore;
    const slippageBps = slippageBpsParam;

    if (leverage === 0 || amount === 0 || !selectedBank || !selectedLoopingBank || !connection) {
      return;
    }

    set({ isLoading: true });

    const loopingObject = await calculateLooping(
      marginfiAccount,
      selectedBank,
      selectedLoopingBank,
      leverage,
      amount,
      slippageBps,
      connection,
      priorityFee
    );

    if (loopingObject && "loopingTxn" in loopingObject) {
      set({
        actionTxns: {
          actionTxn: loopingObject.loopingTxn,
          bundleTipTxn: null,
        },
        actionQuote: loopingObject.quote,
        loopingAmounts: {
          borrowAmount: loopingObject.borrowAmount,
          actualDepositAmount: loopingObject.actualDepositAmount,
        },
      });
    } else {
      if (loopingObject?.description) {
        set({
          errorMessage: loopingObject,
        });
      } else {
        set({
          errorMessage: STATIC_SIMULATION_ERRORS.FL_FAILED,
        });
      }
    }
    set({ isLoading: false });
  },

  async setRepayCollateral(
    marginfiAccount,
    selectedBank,
    selectedRepayBank,
    amount,
    connection,
    priorityFee,
    slippageBps
  ) {
    set({ isLoading: true });
    const repayCollat = await calculateRepayCollateral(
      marginfiAccount,
      selectedBank,
      selectedRepayBank,
      amount,
      slippageBps,
      connection,
      priorityFee
    );

    if (repayCollat && "repayTxn" in repayCollat) {
      set({
        actionTxns: {
          actionTxn: repayCollat.repayTxn,
          bundleTipTxn: repayCollat.bundleTipTxn,
        },
        actionQuote: repayCollat.quote,
        amountRaw: repayCollat.amount.toString(),
      });
    } else {
      if (repayCollat?.description) {
        set({
          errorMessage: repayCollat,
        });
      } else {
        set({
          errorMessage: DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(selectedRepayBank.meta.tokenSymbol),
        });
      }
    }
    set({ isLoading: false });
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
        repayAmountRaw: "",
        loopingAmounts: initialState.loopingAmounts,
        selectedSecondaryBank: null,
        leverage: 0,
        actionTxns: initialState.actionTxns,
        actionQuote: undefined,
        errorMessage: null,
      });
    }
  },

  async setRepayBank(repayTokenBank, slippageBps) {
    const selectedRepayBank = get().selectedSecondaryBank;
    const hasBankChanged =
      !repayTokenBank || !selectedRepayBank || !repayTokenBank.address.equals(selectedRepayBank.address);
    const action = get().actionMode;

    if (action === ActionType.Repay) {
      if (hasBankChanged) {
        set({ selectedSecondaryBank: repayTokenBank, amountRaw: "", repayAmountRaw: "", errorMessage: null });

        const prevTokenBank = get().selectedBank;

        if (repayTokenBank && prevTokenBank) {
          set({ isLoading: true });
          const maxAmount = await calculateMaxRepayableCollateral(prevTokenBank, repayTokenBank, slippageBps);
          if (maxAmount) {
            set({ maxAmountCollat: maxAmount, repayAmountRaw: "" });
          } else {
            set({ errorMessage: DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(repayTokenBank.meta.tokenSymbol) });
          }
          set({ isLoading: false });
        }
      } else {
        set({ selectedSecondaryBank: repayTokenBank });
      }
    } else if (action === ActionType.Loop) {
      if (hasBankChanged) {
        set({
          selectedSecondaryBank: repayTokenBank,
          amountRaw: "",
          repayAmountRaw: "",
          loopingAmounts: initialState.loopingAmounts,
          leverage: 0,
          actionTxns: initialState.actionTxns,
          actionQuote: undefined,
          errorMessage: null,
        });

        const prevTokenBank = get().selectedBank;
        if (prevTokenBank && repayTokenBank) {
          set({ isLoading: true });
          const { maxLeverage, ltv } = computeMaxLeverage(prevTokenBank.info.rawBank, repayTokenBank.info.rawBank);
          set({ maxLeverage });
          set({ isLoading: false });
        }
      } else {
        set({ selectedSecondaryBank: repayTokenBank });
      }
    }
  },
});

export { createFlashLoanBoxStore };
export type { FlashLoanBoxState };
