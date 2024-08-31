import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { QuoteResponse } from "@jup-ag/api";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import * as solanaStakePool from "@solana/spl-stake-pool";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { computeMaxLeverage, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMethod,
  debounceFn,
  isWholePosition,
  LoopingObject,
  LstType,
  RepayType,
  YbxType,
} from "@mrgnlabs/mrgn-utils";
import {
  STATIC_SIMULATION_ERRORS,
  DYNAMIC_SIMULATION_ERRORS,
  calculateLoopingParams,
  calculateRepayCollateralParams,
  calculateMaxRepayableCollateral,
} from "@mrgnlabs/mrgn-utils";

import { StakeData, capture } from "~/utils";
import BigNumber from "bignumber.js";

interface ActionBoxState {
  // State
  slippageBps: number;
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
  repayMode: RepayType;
  lstMode: LstType;
  ybxMode: YbxType;

  selectedBank: ExtendedBankInfo | null;
  selectedRepayBank: ExtendedBankInfo | null;
  selectedStakingAccount: StakeData | null;

  actionQuote: QuoteResponse | null;
  actionTxns: { actionTxn: VersionedTransaction | null; feedCrankTxs: VersionedTransaction[] };

  errorMessage: ActionMethod | null;
  isLoading: boolean;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  refreshSelectedBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: { requestedAction?: ActionType; requestedBank?: ExtendedBankInfo }) => void;
  setSlippageBps: (slippageBps: number) => void;
  setActionMode: (actionMode: ActionType) => void;
  setRepayMode: (repayMode: RepayType) => void;
  setLstMode: (lstMode: LstType) => void;
  setYbxMode: (ybxMode: YbxType) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setActionTxns: (actionTxns: { actionTxn: VersionedTransaction | null; feedCrankTxs: VersionedTransaction[] }) => void;
  setLeverage: (
    leverage: number,
    marginfiAccount: MarginfiAccountWrapper | null,
    connection: Connection,
    priorityFee: number
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
    priorityFee: number
  ) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setRepayBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedStakingAccount: (account: StakeData) => void;
  setRepayCollateral: (
    marginfiAccount: MarginfiAccountWrapper,
    selectedBank: ExtendedBankInfo,
    selectedRepayBank: ExtendedBankInfo,
    amount: number,
    slippageBps: number,
    connection: Connection,
    priorityFee: number
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
    slippageBps?: number;
    connection?: Connection;
    leverage?: number;
    priorityFee: number;
  }) => void;
  setIsLoading: (isLoading: boolean) => void;
}

function createActionBoxStore() {
  return create<ActionBoxState, [["zustand/persist", Pick<ActionBoxState, "slippageBps">]]>(
    persist(stateCreator, {
      name: "actionbox-peristent-store",
      partialize(state) {
        return {
          slippageBps: state.slippageBps,
        };
      },
    })
  );
}

export interface LstData {
  poolAddress: PublicKey;
  tvl: number;
  projectedApy: number;
  lstSolValue: number;
  solDepositFee: number;
  accountData: solanaStakePool.StakePool;
  validatorList: PublicKey[];
}

const initialState = {
  slippageBps: 100,
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
  repayMode: RepayType.RepayRaw,
  lstMode: LstType.Token,
  ybxMode: YbxType.MintYbx,

  selectedBank: null,
  selectedRepayBank: null,
  selectedStakingAccount: null,

  actionQuote: null,
  actionTxns: { actionTxn: null, feedCrankTxs: [] },

  isLoading: false,
};

const stateCreator: StateCreator<ActionBoxState, [], []> = (set, get) => ({
  // State
  ...initialState,

  refreshState(actionMode?: ActionType) {
    if (actionMode) {
      set({ ...initialState, actionMode, slippageBps: get().slippageBps });
    } else {
      set({ ...initialState, slippageBps: get().slippageBps });
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

  setLeverage(leverage, marginfiAccount, connection, priorityFee) {
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
        get().setLooping({ marginfiAccount, connection, leverage: newLeverage, priorityFee });
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

  setRepayAmountRaw(marginfiAccount, amountRaw, connection, priorityFee) {
    const strippedAmount = amountRaw.replace(/,/g, "");
    const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

    const selectedBank = get().selectedBank;
    const selectedRepayBank = get().selectedRepayBank;
    const slippageBps = get().slippageBps;

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
      selectedRepayBank: selectedLoopingBankStore,
      amountRaw,
      slippageBps: slippageBpsStore,
      leverage: leverageStore,
    } = get();
    const strippedAmount = amountRaw.replace(/,/g, "");
    const amountStore = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

    const leverage = selectedLeverageParam ?? leverageStore;
    const selectedBank = selectedBankParam ?? selectedBankStore;
    const selectedLoopingBank = selectedLoopingBankParam ?? selectedLoopingBankStore;
    const amount = amountParam ?? amountStore;
    const slippageBps = slippageBpsParam ?? slippageBpsStore;

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
          feedCrankTxs: loopingObject.feedCrankTxs,
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
    slippageBps,
    connection,
    priorityFee
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
          feedCrankTxs: repayCollat.feedCrankTxs,
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
    const selectedRepayBank = get().selectedRepayBank;

    if (selectedBank) {
      const updatedBank = banks.find((v) => v.address.equals(selectedBank.address));
      if (updatedBank) {
        set({ selectedBank: updatedBank });
      }
    }

    if (selectedRepayBank) {
      const updatedRepayBank = banks.find((v) => v.address.equals(selectedRepayBank.address));
      if (updatedRepayBank) {
        set({ selectedRepayBank: updatedRepayBank });
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
        selectedRepayBank: null,
        leverage: 0,
        actionTxns: initialState.actionTxns,
        actionQuote: undefined,
        errorMessage: null,
      });
    }
  },

  async setRepayBank(repayTokenBank) {
    const selectedRepayBank = get().selectedRepayBank;
    const hasBankChanged =
      !repayTokenBank || !selectedRepayBank || !repayTokenBank.address.equals(selectedRepayBank.address);
    const action = get().actionMode;

    if (action === ActionType.Repay) {
      if (hasBankChanged) {
        set({ selectedRepayBank: repayTokenBank, amountRaw: "", repayAmountRaw: "", errorMessage: null });

        const repayMode = get().repayMode;
        const prevTokenBank = get().selectedBank;
        const slippageBps = get().slippageBps;

        if (repayMode === RepayType.RepayCollat && repayTokenBank && prevTokenBank) {
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
        set({ selectedRepayBank: repayTokenBank });
      }
    } else if (action === ActionType.Loop) {
      if (hasBankChanged) {
        set({
          selectedRepayBank: repayTokenBank,
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
        set({ selectedRepayBank: repayTokenBank });
      }
    }
  },

  setYbxMode(ybxMode) {
    set({ ybxMode });
  },

  setSelectedStakingAccount(account) {
    set({ selectedStakingAccount: account });
  },

  async setSlippageBps(slippageBps) {
    const repayMode = get().repayMode;
    const actionMode = get().actionMode;
    const tokenBank = get().selectedBank;
    const repayTokenBank = get().selectedRepayBank;

    if (repayMode === RepayType.RepayCollat && repayTokenBank && tokenBank) {
      set({ isLoading: true });
      const maxAmount = await calculateMaxRepayableCollateral(tokenBank, repayTokenBank, slippageBps);
      if (maxAmount) {
        set({ maxAmountCollat: maxAmount, repayAmountRaw: "" });
      } else {
        set({
          errorMessage: DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(repayTokenBank.meta.tokenSymbol),
        });
      }
      set({ isLoading: false });
    }

    if (actionMode === ActionType.Loop) {
      set({
        actionQuote: undefined,
        actionTxns: initialState.actionTxns,
        loopingAmounts: initialState.loopingAmounts,
        leverage: 0,
      });
    }

    set({ slippageBps });
  },

  setLstMode(lstMode) {
    set({ lstMode });
  },

  async setRepayMode(newRepayMode) {
    const repayMode = get().repayMode;
    const repayModeChanged = repayMode !== newRepayMode;

    if (repayModeChanged) {
      set({ repayAmountRaw: "", actionQuote: null, repayMode: newRepayMode, errorMessage: null });
    }

    if (newRepayMode === RepayType.RepayCollat) {
      const bank = get().selectedBank;
      const repayBank = get().selectedRepayBank;
      const slippageBps = get().slippageBps;

      if (bank && repayBank) {
        set({ isLoading: true });
        const maxAmount = await calculateMaxRepayableCollateral(bank, repayBank, slippageBps);
        if (maxAmount) {
          set({ maxAmountCollat: maxAmount, repayAmountRaw: "" });
        } else {
          set({
            errorMessage: DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(repayBank.meta.tokenSymbol),
          });
        }
        set({ isLoading: false });
      }
    }
  },

  setActionTxns(actionTxns) {
    set({ actionTxns });
  },

  setActionMode(actionMode) {
    const selectedActionMode = get().actionMode;
    const hasActionModeChanged = !selectedActionMode || actionMode !== selectedActionMode;

    if (hasActionModeChanged) set({ amountRaw: "", repayAmountRaw: "", errorMessage: null });

    if (actionMode !== ActionType.Repay) {
      set({ repayMode: RepayType.RepayRaw });
    }

    if (actionMode === ActionType.Repay) {
      set({ slippageBps: 100 });
    } else {
      set({ slippageBps: 30 });
    }
    set({ actionMode });
  },

  setIsLoading(isLoading) {
    set({ isLoading });
  },
});

async function calculateLooping(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo, // deposit
  loopBank: ExtendedBankInfo, // borrow
  targetLeverage: number,
  amount: number,
  slippageBps: number,
  connection: Connection,
  priorityFee: number
): Promise<LoopingObject | ActionMethod> {
  // TODO setup logging again
  // capture("looper", {
  //   amountIn: uiToNative(amount, loopBank.info.state.mintDecimals).toNumber(),
  //   firstQuote,
  //   bestQuote: swapQuote,
  //   inputMint: loopBank.info.state.mint.toBase58(),
  //   outputMint: bank.info.state.mint.toBase58(),
  // });

  const result = await calculateLoopingParams({
    marginfiAccount,
    depositBank: bank,
    borrowBank: loopBank,
    targetLeverage,
    amount,
    slippageBps,
    connection,
    priorityFee,
  });

  return result;
}

export interface BorrowLendObject {
  actionTx: VersionedTransaction | null;
  bundleTipTxs: VersionedTransaction[];
}

// ugly code but it works
async function calculateBorrowLend(
  marginfiAccount: MarginfiAccountWrapper,
  type: ActionType,
  bank: ExtendedBankInfo, // deposit
  amount: number
): Promise<BorrowLendObject> {
  let actionTx: VersionedTransaction | null = null;
  let bundleTipTxs: VersionedTransaction[] = [];

  if (type === ActionType.Borrow) {
    const { borrowTx, feedCrankTxs } = await marginfiAccount.makeBorrowTx(
      amount,
      bank.address,
      {
        createAtas: true,
        wrapAndUnwrapSol: false,
      }
    );

    actionTx = borrowTx;
    bundleTipTxs = feedCrankTxs;
  }

  if (type === ActionType.Withdraw) {
    const { withdrawTx, feedCrankTxs } = await marginfiAccount.makeWithdrawTx(
      amount,
      bank.address,
      bank.isActive && isWholePosition(bank, amount)
    );

    actionTx = withdrawTx;
    bundleTipTxs = feedCrankTxs;
  }

  return {
    actionTx,
    bundleTipTxs,
  };
}

async function calculateRepayCollateral(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo, // borrow
  repayBank: ExtendedBankInfo, // deposit
  amount: number,
  slippageBps: number,
  connection: Connection,
  priorityFee: number
): Promise<
  | {
    repayTxn: VersionedTransaction;
    feedCrankTxs: VersionedTransaction[];
    quote: QuoteResponse;
    amount: number;
  }
  | ActionMethod
> {
  // TODO setup logging again
  // capture("repay_with_collat", {
  //   amountIn: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
  //   firstQuote,
  //   bestQuote: swapQuote,
  //   inputMint: repayBank.info.state.mint.toBase58(),
  //   outputMint: bank.info.state.mint.toBase58(),
  // });

  const result = await calculateRepayCollateralParams(
    marginfiAccount,
    bank,
    repayBank,
    amount,
    slippageBps,
    connection,
    priorityFee
  );

  return result;
}

export { createActionBoxStore, calculateBorrowLend };
export type { ActionBoxState };
