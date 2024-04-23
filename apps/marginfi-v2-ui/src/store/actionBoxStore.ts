import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { QuoteGetRequest, QuoteResponse } from "@jup-ag/api";
import { Connection, PublicKey } from "@solana/web3.js";
import * as solanaStakePool from "@solana/spl-stake-pool";

import { nativeToUi, uiToNative } from "@mrgnlabs/mrgn-common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { LstType, RepayType, StakeData, YbxType, debounceFn, getSwapQuoteWithRetry, verifyJupTxSize } from "~/utils";
import { LendingModes } from "~/types";

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
  selectedStakingAccount: StakeData | null;
  repayCollatQuote: QuoteResponse | null;

  errorMessage: string;
  isLoading: boolean;

  // Actions
  refreshState: () => void;
  fetchActionBoxState: (args: {
    lendingMode: LendingModes;
    requestedAction?: ActionType;
    requestedBank?: ExtendedBankInfo;
  }) => void;
  setSlippageBps: (slippageBps: number) => void;
  setActionMode: (actionMode: ActionType) => void;
  setRepayMode: (repayMode: RepayType) => void;
  setLstMode: (lstMode: LstType) => void;
  setYbxMode: (ybxMode: YbxType) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setRepayAmountRaw: (repayAmountRaw: string, connection: Connection) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setRepayBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedStakingAccount: (account: StakeData) => void;
  setRepayCollateral: (
    selectedBank: ExtendedBankInfo,
    selectedRepayBank: ExtendedBankInfo,
    amount: number,
    slippageBps: number,
    connection: Connection
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
  errorMessage: "",

  actionMode: ActionType.Deposit,
  repayMode: RepayType.RepayRaw,
  lstMode: LstType.Token,
  ybxMode: YbxType.MintYbx,

  selectedBank: null,
  selectedRepayBank: null,
  selectedStakingAccount: null,

  repayCollatQuote: null,

  isLoading: false,
};

const stateCreator: StateCreator<ActionBoxState, [], []> = (set, get) => ({
  // State
  ...initialState,

  refreshState() {
    set({ ...initialState, slippageBps: get().slippageBps });
  },

  fetchActionBoxState(args) {
    let requestedAction: ActionType | null = null;
    let requestedBank: ExtendedBankInfo | null = null;
    let slippageBps = get().slippageBps;

    if (args.requestedAction) {
      requestedAction = args.requestedAction;
    } else {
      if (args.lendingMode === LendingModes.LEND) {
        requestedAction = ActionType.Deposit;
      } else {
        requestedAction = ActionType.Borrow;
      }
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

    const actionMode = get().actionMode;
    const selectedBank = get().selectedBank;

    const needRefresh =
      !selectedBank ||
      actionMode !== requestedAction ||
      (requestedBank && !requestedBank.address.equals(selectedBank.address));

    if (needRefresh) set({ ...initialState, actionMode: requestedAction, selectedBank: requestedBank, slippageBps });
  },

  setAmountRaw(amountRaw, maxAmount) {
    const repayMode = get().repayMode;

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

  setRepayAmountRaw(amountRaw, connection) {
    const strippedAmount = amountRaw.replace(/,/g, "");
    const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

    const selectedBank = get().selectedBank;
    const selectedRepayBank = get().selectedRepayBank;
    const slippageBps = get().slippageBps;

    set({ repayAmountRaw: amountRaw });

    if (selectedBank && selectedRepayBank) {
      const setCollat = debounceFn(get().setRepayCollateral, 500);
      setCollat(selectedBank, selectedRepayBank, amount, slippageBps, connection);
    }
  },

  async setRepayCollateral(selectedBank, selectedRepayBank, amount, slippageBps, connection) {
    set({ isLoading: true });
    const repayCollat = await calculateRepayCollateral(
      selectedBank,
      selectedRepayBank,
      amount,
      slippageBps,
      connection
    );

    if (repayCollat) {
      set({ repayCollatQuote: repayCollat.quote, amountRaw: repayCollat.amount.toString() });
    } else {
      set({
        errorMessage: "Unable to retrieve data. Please choose a different collateral option or refresh the page.",
      });
    }
    set({ isLoading: false });
  },

  async setSelectedBank(tokenBank) {
    const selectedBank = get().selectedBank;
    const hasBankChanged = !tokenBank || !selectedBank || !tokenBank.address.equals(selectedBank.address);

    if (hasBankChanged) {
      set({ selectedBank: tokenBank, amountRaw: "", repayAmountRaw: "" });

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
      set({ selectedRepayBank: repayTokenBank, amountRaw: "", repayAmountRaw: "" });

      const repayMode = get().repayMode;
      const prevTokenBank = get().selectedBank;
      const slippageBps = get().slippageBps;

      if (repayMode === RepayType.RepayCollat && repayTokenBank && prevTokenBank) {
        set({ isLoading: true });
        const maxAmount = await calculateMaxCollat(prevTokenBank, repayTokenBank, slippageBps);
        if (maxAmount) {
          set({ maxAmountCollat: maxAmount, repayAmountRaw: "" });
        } else {
          set({
            errorMessage: `Unable to repay using ${repayTokenBank.meta.tokenSymbol}, please select another collateral.`,
          });
        }
        set({ isLoading: false });
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
    const tokenBank = get().selectedBank;
    const repayTokenBank = get().selectedRepayBank;

    if (repayMode === RepayType.RepayCollat && repayTokenBank && tokenBank) {
      set({ isLoading: true });
      const maxAmount = await calculateMaxCollat(tokenBank, repayTokenBank, slippageBps);
      if (maxAmount) {
        set({ maxAmountCollat: maxAmount, repayAmountRaw: "" });
      } else {
        set({
          errorMessage: `Unable to repay using ${repayTokenBank.meta.tokenSymbol}, please select another collateral.`,
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
        const maxAmount = await calculateMaxCollat(bank, repayBank, slippageBps);
        if (maxAmount) {
          set({ maxAmountCollat: maxAmount, repayAmountRaw: "" });
        } else {
          set({
            errorMessage: `Unable to repay using ${repayBank.meta.tokenSymbol}, please select another collateral.`,
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

async function calculateRepayCollateral(
  bank: ExtendedBankInfo,
  repayBank: ExtendedBankInfo,
  amount: number,
  slippageBps: number,
  connection: Connection
): Promise<{ quote: QuoteResponse; amount: number } | null> {
  const maxRepayAmount = bank.isActive ? bank?.position.amount : 0;

  const quoteParams = {
    amount: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
    inputMint: repayBank.info.state.mint.toBase58(),
    outputMint: bank.info.state.mint.toBase58(),
    slippageBps: slippageBps,
    swapMode: "ExactIn",
    maxAccounts: 20,
    // onlyDirectRoutes: true,
  } as QuoteGetRequest;

  try {
    const swapQuote = await getSwapQuoteWithRetry(quoteParams);

    if (swapQuote) {
      await verifyJupTxSize(swapQuote, connection);
      const outAmount = nativeToUi(swapQuote.outAmount, bank.info.state.mintDecimals);
      const outAmountThreshold = nativeToUi(swapQuote.otherAmountThreshold, bank.info.state.mintDecimals);

      const amountToRepay = outAmount > maxRepayAmount ? maxRepayAmount : outAmountThreshold;

      return { quote: swapQuote, amount: amountToRepay };
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function calculateMaxCollat(bank: ExtendedBankInfo, repayBank: ExtendedBankInfo, slippageBps: number) {
  const amount = repayBank.isActive && repayBank.position.isLending ? repayBank.position.amount : 0;
  const maxRepayAmount = bank.isActive ? bank?.position.amount : 0;

  if (amount !== 0) {
    const quoteParams = {
      amount: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
      inputMint: repayBank.info.state.mint.toBase58(),
      outputMint: bank.info.state.mint.toBase58(),
      slippageBps: slippageBps,
      swapMode: "ExactIn" as any,
      maxAccounts: 20,
    } as QuoteGetRequest;

    try {
      const swapQuoteInput = await getSwapQuoteWithRetry(quoteParams);

      if (!swapQuoteInput) throw new Error();

      const inputInOtherAmount = nativeToUi(swapQuoteInput.otherAmountThreshold, bank.info.state.mintDecimals);

      if (inputInOtherAmount > maxRepayAmount) {
        const quoteParams = {
          amount: uiToNative(maxRepayAmount, bank.info.state.mintDecimals).toNumber(),
          inputMint: repayBank.info.state.mint.toBase58(), // USDC
          outputMint: bank.info.state.mint.toBase58(), // JITO
          slippageBps: slippageBps,
          swapMode: "ExactOut",
        } as QuoteGetRequest;

        const swapQuoteOutput = await getSwapQuoteWithRetry(quoteParams);
        if (!swapQuoteOutput) throw new Error();

        const inputOutOtherAmount =
          nativeToUi(swapQuoteOutput.otherAmountThreshold, repayBank.info.state.mintDecimals) * 1.01; // add this if dust appears: "* 1.01"
        return inputOutOtherAmount;
      } else {
        return amount;
      }
    } catch {
      return 0;
    }
  }
}

export { createActionBoxStore };
export type { ActionBoxState };
