import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { QuoteGetRequest, QuoteResponse } from "@jup-ag/api";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import * as solanaStakePool from "@solana/spl-stake-pool";

import { nativeToUi, uiToNative } from "@mrgnlabs/mrgn-common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { computeMaxLeverage, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import {
  LstType,
  RepayType,
  StakeData,
  YbxType,
  capture,
  debounceFn,
  getSwapQuoteWithRetry,
  verifyJupTxSizeCollat,
  verifyJupTxSizeLooping,
} from "~/utils";
import BigNumber from "bignumber.js";

interface ActionBoxState {
  // State
  slippageBps: number;
  amountRaw: string;
  repayAmountRaw: string;
  maxAmountCollat: number;
  loopingAmount: BigNumber;

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
  actionTxn: VersionedTransaction | null;

  errorMessage: string;
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
  setLeverage: (leverage: number, marginfiAccount: MarginfiAccountWrapper | null, connection: Connection) => void;
  setLoopingAmountRaw: (
    marginfiAccount: MarginfiAccountWrapper,
    amountRaw: string,
    connection: Connection,
    maxAmount?: number
  ) => void;
  setRepayAmountRaw: (marginfiAccount: MarginfiAccountWrapper, repayAmountRaw: string, connection: Connection) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setRepayBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedStakingAccount: (account: StakeData) => void;
  setRepayCollateral: (
    marginfiAccount: MarginfiAccountWrapper,
    selectedBank: ExtendedBankInfo,
    selectedRepayBank: ExtendedBankInfo,
    amount: number,
    slippageBps: number,
    connection: Connection
  ) => void;
  setLooping: (
    marginfiAccount: MarginfiAccountWrapper,
    selectedBank: ExtendedBankInfo,
    selectedLoopingBank: ExtendedBankInfo,
    amount: number,
    slippageBps: number,
    connection: Connection,
    leverage?: number
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

  leverage: 0,
  maxLeverage: 0,
  loopingAmount: new BigNumber(0),

  actionMode: ActionType.Deposit,
  repayMode: RepayType.RepayRaw,
  lstMode: LstType.Token,
  ybxMode: YbxType.MintYbx,

  selectedBank: null,
  selectedRepayBank: null,
  selectedStakingAccount: null,

  actionQuote: null,
  actionTxn: null,

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

  setLeverage(leverage, marginfiAccount, connection) {
    const maxLeverage = get().maxLeverage;
    const prevLeverage = get().leverage;

    let newLeverage = leverage;

    const isLeverageChanged = prevLeverage !== newLeverage;

    if (maxLeverage && isLeverageChanged) {
      if (leverage > maxLeverage) {
        newLeverage = maxLeverage;
      }

      set({ leverage: newLeverage });

      const { selectedBank, selectedRepayBank, amountRaw, slippageBps, setLooping } = get();
      const strippedAmount = amountRaw.replace(/,/g, "");
      const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

      if (selectedBank && selectedRepayBank && marginfiAccount && connection) {
        setLooping(marginfiAccount, selectedBank, selectedRepayBank, amount, slippageBps, connection, newLeverage);
      }
    }
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

  setLoopingAmountRaw(marginfiAccount, amountRaw, connection, maxAmount) {
    // if (!maxAmount) {
    //   set({ amountRaw });
    // } else {
    const prevAmountRaw = get().amountRaw;
    const isAmountChanged = amountRaw !== prevAmountRaw;

    if (isAmountChanged) {
      set({ amountRaw });
      const strippedAmount = amountRaw.replace(/,/g, "");
      const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
      const numberFormater = new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 });

      const selectedBank = get().selectedBank;
      const selectedRepayBank = get().selectedRepayBank;
      const slippageBps = get().slippageBps;

      if (selectedBank && selectedRepayBank && amount !== 0) {
        get().setLooping(marginfiAccount, selectedBank, selectedRepayBank, amount, slippageBps, connection);
      }
    }
  },

  setRepayAmountRaw(marginfiAccount, amountRaw, connection) {
    const strippedAmount = amountRaw.replace(/,/g, "");
    const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

    const selectedBank = get().selectedBank;
    const selectedRepayBank = get().selectedRepayBank;
    const slippageBps = get().slippageBps;

    set({ repayAmountRaw: amountRaw });

    if (selectedBank && selectedRepayBank && connection) {
      const setCollat = debounceFn(get().setRepayCollateral, 500);
      setCollat(marginfiAccount, selectedBank, selectedRepayBank, amount, slippageBps, connection);
    }
  },

  async setLooping(
    marginfiAccount,
    selectedBank,
    selectedLoopingBank,
    amount,
    slippageBps,
    connection,
    selectedLeverage
  ) {
    const leverage = selectedLeverage ?? get().leverage;

    if (leverage === 0 || amount === 0) {
      return;
    }

    set({ isLoading: true });

    console.log("entering calc");

    const loopingObject = await calculateLooping(
      marginfiAccount,
      selectedBank,
      selectedLoopingBank,
      leverage,
      amount,
      slippageBps,
      connection
    );

    if (loopingObject) {
      set({
        actionTxn: loopingObject.loopingTxn,
        actionQuote: loopingObject.quote,
        loopingAmount: loopingObject.amount,
      });
    } else {
      set({
        errorMessage: "Unable to retrieve data. Please choose a different collateral option or refresh the page.",
      });
    }
    set({ isLoading: false });
  },

  async setRepayCollateral(marginfiAccount, selectedBank, selectedRepayBank, amount, slippageBps, connection) {
    set({ isLoading: true });
    const repayCollat = await calculateRepayCollateral(
      marginfiAccount,
      selectedBank,
      selectedRepayBank,
      amount,
      slippageBps,
      connection
    );

    if (repayCollat) {
      set({
        actionTxn: repayCollat.repayTxn,
        actionQuote: repayCollat.quote,
        amountRaw: repayCollat.amount.toString(),
      });
    } else {
      set({
        errorMessage: "Unable to retrieve data. Please choose a different collateral option or refresh the page.",
      });
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
    const action = get().actionMode;

    if (action === ActionType.Repay) {
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
      } else {
        set({ selectedRepayBank: repayTokenBank });
      }
    } else if (action === ActionType.Loop) {
      if (hasBankChanged) {
        set({ selectedRepayBank: repayTokenBank, amountRaw: "", repayAmountRaw: "" });

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
      set({ repayAmountRaw: "", actionQuote: null, repayMode: newRepayMode });
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

async function calculateLooping(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo, // deposit
  loopBank: ExtendedBankInfo, // borrow
  targetLeverage: number,
  amount: number,
  slippageBps: number,
  connection: Connection
): Promise<{ loopingTxn: VersionedTransaction; quote: QuoteResponse; amount: BigNumber } | null> {
  //const slippageBps = 0.01 * 10000;

  console.log("bank A: " + bank.meta.tokenSymbol);
  console.log("bank B: " + loopBank.meta.tokenSymbol);
  console.log("leverage: " + targetLeverage);
  console.log("amount " + amount);

  const principalBufferAmountUi = amount * targetLeverage * (slippageBps / 10000);
  const adjustedPrincipalAmountUi = amount - principalBufferAmountUi;

  const { borrowAmount, depositAmount } = marginfiAccount.computeLoopingParams(
    adjustedPrincipalAmountUi,
    targetLeverage,
    bank.address,
    loopBank.address
  );

  console.log({ borrowAmount: borrowAmount.toString(), depositAmount: depositAmount.toString() });

  const borrowAmountNative = uiToNative(borrowAmount, loopBank.info.state.mintDecimals).toNumber();

  const maxLoopAmount = bank.isActive ? bank?.position.amount : 0;

  const maxAccountsArr = [undefined, 50, 40, 30];

  let firstQuote;

  console.log("entering loop");

  for (const maxAccounts of maxAccountsArr) {
    const quoteParams = {
      amount: borrowAmountNative,
      inputMint: loopBank.info.state.mint.toBase58(), // borrow
      outputMint: bank.info.state.mint.toBase58(), // deposit
      slippageBps: slippageBps,
      maxAccounts: maxAccounts,
      swapMode: "ExactIn",
    } as QuoteGetRequest;
    try {
      console.log("trying " + maxAccounts);
      const swapQuote = await getSwapQuoteWithRetry(quoteParams);

      if (!maxAccounts) {
        firstQuote = swapQuote;
      }

      if (swapQuote) {
        const minSwapAmountOutUi = nativeToUi(swapQuote.otherAmountThreshold, bank.info.state.mintDecimals);
        const actualDepositAmountUi = minSwapAmountOutUi + amount;

        console.log({ actualDepositAmountUi });
        console.log({ borrowAmount: borrowAmount.toString() });

        const txn = await verifyJupTxSizeLooping(
          marginfiAccount,
          bank,
          loopBank,
          actualDepositAmountUi,
          borrowAmount,
          swapQuote,
          connection
        );
        if (txn) {
          // capture("repay_with_collat", {
          //   amountIn: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
          //   firstQuote,
          //   bestQuote: swapQuote,
          //   inputMint: repayBank.info.state.mint.toBase58(),
          //   outputMint: bank.info.state.mint.toBase58(),
          // });
          return { loopingTxn: txn, quote: swapQuote, amount: borrowAmount };
        }
      } else {
        throw new Error("Swap quote failed");
      }
    } catch (error) {
      console.error(error);
      // capture("repay_with_collat", {
      //   amountIn: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
      //   firstQuote,
      //   inputMint: repayBank.info.state.mint.toBase58(),
      //   outputMint: bank.info.state.mint.toBase58(),
      // });
      return null;
    }
  }
  return null;
}

async function calculateRepayCollateral(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo,
  repayBank: ExtendedBankInfo,
  amount: number,
  slippageBps: number,
  connection: Connection
): Promise<{ repayTxn: VersionedTransaction; quote: QuoteResponse; amount: number } | null> {
  const maxRepayAmount = bank.isActive ? bank?.position.amount : 0;

  const maxAccountsArr = [undefined, 50, 40, 30];

  let firstQuote;

  for (const maxAccounts of maxAccountsArr) {
    const quoteParams = {
      amount: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
      inputMint: repayBank.info.state.mint.toBase58(),
      outputMint: bank.info.state.mint.toBase58(),
      slippageBps: slippageBps,
      maxAccounts: maxAccounts,
      swapMode: "ExactIn",
    } as QuoteGetRequest;
    try {
      const swapQuote = await getSwapQuoteWithRetry(quoteParams);

      if (!maxAccounts) {
        firstQuote = swapQuote;
      }

      if (swapQuote) {
        const outAmount = nativeToUi(swapQuote.outAmount, bank.info.state.mintDecimals);
        const outAmountThreshold = nativeToUi(swapQuote.otherAmountThreshold, bank.info.state.mintDecimals);

        const amountToRepay = outAmount > maxRepayAmount ? maxRepayAmount : outAmountThreshold;

        const txn = await verifyJupTxSizeCollat(
          marginfiAccount,
          bank,
          repayBank,
          amountToRepay,
          amount,
          swapQuote,
          connection
        );
        if (txn) {
          capture("repay_with_collat", {
            amountIn: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
            firstQuote,
            bestQuote: swapQuote,
            inputMint: repayBank.info.state.mint.toBase58(),
            outputMint: bank.info.state.mint.toBase58(),
          });
          return { repayTxn: txn, quote: swapQuote, amount: amountToRepay };
        }
      } else {
        throw new Error("Swap quote failed");
      }
    } catch (error) {
      console.error(error);
      capture("repay_with_collat", {
        amountIn: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
        firstQuote,
        inputMint: repayBank.info.state.mint.toBase58(),
        outputMint: bank.info.state.mint.toBase58(),
      });
      return null;
    }
  }
  return null;
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
      maxAccounts: 40,
      swapMode: "ExactIn",
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
