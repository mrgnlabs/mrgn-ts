import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { QuoteResponse } from "@jup-ag/api";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import * as solanaStakePool from "@solana/spl-stake-pool";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import {
  LstType,
  RepayType,
  YbxType,
  ActionMethod,
  calculateMaxRepayableCollateral,
  calculateRepayCollateralParams,
  DYNAMIC_SIMULATION_ERRORS,
  isWholePosition,
} from "@mrgnlabs/mrgn-utils";

import { debounceFn } from "~/utils";

interface ActionBoxState {
  // State
  slippageBps: number;
  amountRaw: string;
  repayAmountRaw: string;
  maxAmountCollat: number;

  actionMode: ActionType;
  repayMode: RepayType;
  lstMode: LstType;
  ybxMode: YbxType;

  selectedBank: ExtendedBankInfo | null;
  selectedRepayBank: ExtendedBankInfo | null;
  repayCollatQuote: QuoteResponse | null;
  repayCollatTxns: {
    repayCollatTxn: VersionedTransaction | null;
    feedCrankTxs: VersionedTransaction[];
  };

  errorMessage: ActionMethod | null;
  isLoading: boolean;

  // Actions
  refreshState: () => void;
  refreshSelectedBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: { requestedAction?: ActionType; requestedBank?: ExtendedBankInfo }) => void;
  setSlippageBps: (slippageBps: number) => void;
  setActionMode: (actionMode: ActionType) => void;
  setRepayMode: (repayMode: RepayType) => void;
  setLstMode: (lstMode: LstType) => void;
  setYbxMode: (ybxMode: YbxType) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setRepayAmountRaw: (
    marginfiAccount: MarginfiAccountWrapper,
    repayAmountRaw: string,
    connection: Connection,
    priorityFees: number,
    platformFeeBps?: number
  ) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setRepayBank: (bank: ExtendedBankInfo | null) => void;
  setRepayCollateral: (
    marginfiAccount: MarginfiAccountWrapper,
    selectedBank: ExtendedBankInfo,
    selectedRepayBank: ExtendedBankInfo,
    amount: number,
    slippageBps: number,
    connection: Connection,
    priorityFee: number,
    platformFeeBps: number
  ) => void;
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

  actionMode: ActionType.Deposit,
  repayMode: RepayType.RepayRaw,
  lstMode: LstType.Token,
  ybxMode: YbxType.MintYbx,

  selectedBank: null,
  selectedRepayBank: null,
  selectedStakingAccount: null,

  repayCollatQuote: null,
  repayCollatTxns: {
    repayCollatTxn: null,
    feedCrankTxs: [],
  },

  isLoading: false,
};

const stateCreator: StateCreator<ActionBoxState, [], []> = (set, get) => ({
  // State
  ...initialState,

  refreshState() {
    set({ ...initialState, slippageBps: get().slippageBps });
  },

  fetchActionBoxState(args) {
    let requestedAction: ActionType;
    let requestedBank: ExtendedBankInfo | null = null;
    let slippageBps = get().slippageBps;
    const actionMode = get().actionMode;

    if (args.requestedAction) {
      requestedAction = args.requestedAction;
    } else {
      requestedAction = actionMode;
    }

    if (requestedBank === ActionType.Repay) {
      slippageBps = 100;
    } else {
      slippageBps = 30;
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

    if (needRefresh) set({ ...initialState, actionMode: requestedAction, selectedBank: requestedBank, slippageBps });
  },

  setAmountRaw(amountRaw, maxAmount) {
    if (!maxAmount) {
      set({ amountRaw });
    } else {
      const strippedAmount = amountRaw.replace(/,/g, "");
      const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
      const numberFormater = new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 });

      if (amount && amount > maxAmount) {
        set({ amountRaw: numberFormater.format(maxAmount) });
      } else {
        set({ amountRaw: numberFormater.format(amount) });
      }
    }
  },

  setRepayAmountRaw(marginfiAccount, amountRaw, connection, priorityFee, platformFeeBps) {
    const strippedAmount = amountRaw.replace(/,/g, "");
    const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

    const selectedBank = get().selectedBank;
    const selectedRepayBank = get().selectedRepayBank;
    const slippageBps = get().slippageBps;

    set({ repayAmountRaw: amountRaw });

    if (selectedBank && selectedRepayBank) {
      const setCollat = debounceFn(get().setRepayCollateral, 500);
      setCollat(
        marginfiAccount,
        selectedBank,
        selectedRepayBank,
        amount,
        slippageBps,
        connection,
        priorityFee,
        platformFeeBps
      );
    }
  },

  async setRepayCollateral(
    marginfiAccount,
    selectedBank,
    selectedRepayBank,
    amount,
    slippageBps,
    connection,
    priorityFee,
    platformFeeBps
  ) {
    set({ isLoading: true });
    const repayCollat = await calculateRepayCollateralParams(
      marginfiAccount,
      selectedBank,
      selectedRepayBank,
      amount,
      slippageBps,
      connection,
      priorityFee,
      platformFeeBps,
      "BUNDLE"
    );

    if (repayCollat && "repayTxn" in repayCollat) {
      set({
        repayCollatTxns: {
          repayCollatTxn: repayCollat.repayTxn,
          feedCrankTxs: repayCollat.feedCrankTxs,
        },
        repayCollatQuote: repayCollat.quote,
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
      set({ selectedBank: tokenBank, amountRaw: "", repayAmountRaw: "", errorMessage: null });

      const repayMode = get().repayMode;
      const repayBank = get().selectedRepayBank;
      const slippageBps = get().slippageBps;

      // if (repayMode === RepayType.RepayCollat && tokenBank && repayBank) {
      //   const maxAmount = await calculateMaxCollat(tokenBank, repayBank, slippageBps);
      //   set({ maxAmountCollat: maxAmount, repayAmountRaw: "" });
      // }
    }
  },

  async setRepayBank(repayTokenBank) {
    const selectedRepayBank = get().selectedRepayBank;
    const hasBankChanged =
      !repayTokenBank || !selectedRepayBank || !repayTokenBank.address.equals(selectedRepayBank.address);

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
  },

  setYbxMode(ybxMode) {
    set({ ybxMode });
  },

  async setSlippageBps(slippageBps) {
    const repayMode = get().repayMode;
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

    set({ slippageBps });
  },

  setLstMode(lstMode) {
    set({ lstMode });
  },

  async setRepayMode(newRepayMode) {
    const repayMode = get().repayMode;
    const repayModeChanged = repayMode !== newRepayMode;

    if (repayModeChanged) {
      set({ repayAmountRaw: "", repayCollatQuote: null, repayMode: newRepayMode });
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

  setActionMode(actionMode) {
    const selectedActionMode = get().actionMode;
    const hasActionModeChanged = !selectedActionMode || actionMode !== selectedActionMode;

    if (hasActionModeChanged) set({ amountRaw: "", repayAmountRaw: "" });

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

export interface BorrowLendObject {
  actionTx: VersionedTransaction | null;
  feedCrankTxs: VersionedTransaction[];
}

// ugly code but it works
async function calculateBorrowLend(
  marginfiAccount: MarginfiAccountWrapper,
  type: ActionType,
  bank: ExtendedBankInfo, // deposit
  amount: number
): Promise<BorrowLendObject> {
  let actionTx: VersionedTransaction | null = null;
  let feedCrankTxs: VersionedTransaction[] = [];

  if (type === ActionType.Borrow) {
    const { borrowTx, feedCrankTxs } = await marginfiAccount.makeBorrowTx(amount, bank.address, {
      createAtas: true,
      wrapAndUnwrapSol: false,
    });

    return {
      actionTx: borrowTx,
      feedCrankTxs: feedCrankTxs,
    };
  }

  if (type === ActionType.Withdraw) {
    const { withdrawTx, feedCrankTxs } = await marginfiAccount.makeWithdrawTx(
      amount,
      bank.address,
      bank.isActive && isWholePosition(bank, amount)
    );

    return {
      actionTx: withdrawTx,
      feedCrankTxs: feedCrankTxs,
    };
  }

  return {
    actionTx,
    feedCrankTxs,
  };
}

export { createActionBoxStore, calculateBorrowLend };
export type { ActionBoxState };
