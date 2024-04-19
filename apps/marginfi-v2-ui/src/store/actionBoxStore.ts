import { vendor } from "@mrgnlabs/marginfi-client-v2";
import { ACCOUNT_SIZE, TOKEN_PROGRAM_ID, Wallet, aprToApy, nativeToUi, uiToNative } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { create, StateCreator } from "zustand";
import * as solanaStakePool from "@solana/spl-stake-pool";
import {
  LstType,
  PERIOD,
  RepayType,
  StakeData,
  calcYield,
  debounceFn,
  fetchAndParsePricesCsv,
  fetchStakeAccounts,
  getPriceRangeFromPeriod,
  getSwapQuoteWithRetry,
  verifyJupTxSize,
} from "~/utils";
import {
  ActionType,
  ExtendedBankInfo,
  TokenAccount,
  TokenAccountMap,
  fetchBirdeyePrices,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { persist } from "zustand/middleware";
import BN from "bn.js";

import type { TokenInfo, TokenInfoMap } from "@solana/spl-token-registry";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import { LendingModes } from "~/types";
import { QuoteGetRequest, QuoteResponse } from "@jup-ag/api";
import { cp } from "fs";

const STAKEVIEW_APP_URL = "https://stakeview.app/apy/prev3.json";
const BASELINE_VALIDATOR_ID = "mrgn28BhocwdAUEenen3Sw2MR9cPKDpLkDvzDdR7DBD";
const SOLANA_COMPASS_PRICES_URL =
  "https://raw.githubusercontent.com/glitchful-dev/sol-stake-pool-apy/master/db/lst.csv";

export const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
export const LST_MINT = new PublicKey("LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp");
const NETWORK_FEE_LAMPORTS = 15000; // network fee + some for potential account creation
const SOL_USD_PYTH_ORACLE = new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG");
const STAKE_POOL_ID = new PublicKey("DqhH94PjkZsjAqEze2BEkWhFQJ6EyU6MdtMphMgnXqeK");

const SUPPORTED_TOKENS = [
  "7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
  "So11111111111111111111111111111111111111112",
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
];

export type TokenData = Omit<TokenInfo, "logoUri"> & { price: number; balance: BN; iconUrl: string };
export type TokenDataMap = Map<string, TokenData>;

export type SupportedSlippagePercent = 0.1 | 0.5 | 1.0 | 5.0;

interface ActionBoxState {
  // State
  slippageBps: number;
  amountRaw: string;
  repayAmountRaw: string;
  maxAmountCollat: number;

  actionMode: ActionType;
  repayMode: RepayType;
  lstMode: LstType;

  selectedBank: ExtendedBankInfo | null;
  selectedRepayBank: ExtendedBankInfo | null;
  selectedStakingAccount: StakeData | null;
  repayCollatQuote: QuoteResponse | null;

  errorMessage: string;
  isLoading: boolean;

  // Actions
  fetchActionBoxState: (args: {
    lendingMode: LendingModes;
    requestedAction?: ActionType;
    requestedBank?: ExtendedBankInfo;
  }) => void;
  setSlippageBps: (slippageBps: number) => void;
  setActionMode: (actionMode: ActionType) => void;
  setRepayMode: (repayMode: RepayType) => void;
  setLstMode: (LstMode: LstType) => void;
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

  selectedBank: null,
  selectedRepayBank: null,
  selectedStakingAccount: null,

  repayCollatQuote: null,

  isLoading: false,
};

const stateCreator: StateCreator<ActionBoxState, [], []> = (set, get) => ({
  // State
  ...initialState,

  fetchActionBoxState(args) {
    let requestedAction: ActionType | null = null;
    let requestedBank: ExtendedBankInfo | null = null;

    if (args.requestedAction) {
      requestedAction = args.requestedAction;
    } else {
      if (args.lendingMode === LendingModes.LEND) {
        requestedAction = ActionType.Deposit;
      } else {
        requestedAction = ActionType.Borrow;
      }
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

    if (needRefresh) set({ ...initialState, actionMode: requestedAction, selectedBank: requestedBank });
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
      set({ slippageBps: 20 });
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
    // if (amount == 0) {
    //   //   setAmountRaw("0");
    //   return null;
    // }
    const swapQuote = await getSwapQuoteWithRetry(quoteParams);

    if (swapQuote) {
      await verifyJupTxSize(swapQuote, connection);
      const outAmount = nativeToUi(swapQuote.outAmount, bank.info.state.mintDecimals);
      const outAmountThreshold = nativeToUi(swapQuote.otherAmountThreshold, bank.info.state.mintDecimals);

      const amountToRepay = outAmount > maxRepayAmount ? maxRepayAmount : outAmountThreshold;

      //   setAmountRaw(amountToRepay.toString());
      return { quote: swapQuote, amount: amountToRepay };
      //   setRepayCollatQuote(swapQuote);
    } else {
      return null;
    }
  } catch (error) {
    return null;
    // showErrorToast("Unable to retrieve data. Please choose a different collateral option or refresh the page.");
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

async function fetchLstData(connection: Connection): Promise<LstData> {
  const [stakePoolInfo, stakePoolAccount, apyData, solanaCompassPrices] = await Promise.all([
    solanaStakePool.stakePoolInfo(connection, STAKE_POOL_ID),
    solanaStakePool.getStakePoolAccount(connection, STAKE_POOL_ID),
    fetch(STAKEVIEW_APP_URL).then((res) => res.json()),
    fetchAndParsePricesCsv(SOLANA_COMPASS_PRICES_URL),
  ]);
  const stakePool = stakePoolAccount.account.data;

  const poolTokenSupply = Number(stakePoolInfo.poolTokenSupply);
  const totalLamports = Number(stakePoolInfo.totalLamports);
  const lastPoolTokenSupply = Number(stakePoolInfo.lastEpochPoolTokenSupply);
  const lastTotalLamports = Number(stakePoolInfo.lastEpochTotalLamports);

  const solDepositFee = stakePoolInfo.solDepositFee.denominator.eqn(0)
    ? 0
    : stakePoolInfo.solDepositFee.numerator.toNumber() / stakePoolInfo.solDepositFee.denominator.toNumber();

  const lstSolValue = poolTokenSupply > 0 ? totalLamports / poolTokenSupply : 1;

  let projectedApy: number;
  if (lastTotalLamports === 0 || lastPoolTokenSupply === 0) {
    projectedApy = 0.08;
  } else {
    const priceRange = getPriceRangeFromPeriod(solanaCompassPrices, PERIOD.DAYS_7);
    if (!priceRange) {
      throw new Error("No price data found for the specified period!");
    }
    projectedApy = calcYield(priceRange).apy;
  }

  if (projectedApy < 0.08) {
    // temporarily use baseline validator APY waiting for a few epochs to pass
    const baselineValidatorData = apyData.validators.find((validator: any) => validator.id === BASELINE_VALIDATOR_ID);
    if (baselineValidatorData) projectedApy = baselineValidatorData.apy;
  }

  return {
    poolAddress: new PublicKey(stakePoolInfo.address),
    tvl: totalLamports / 1e9,
    projectedApy,
    lstSolValue,
    solDepositFee,
    accountData: stakePool,
    validatorList: stakePoolInfo.validatorList.map((v) => new PublicKey(v.voteAccountAddress)),
  };
}

async function fetchJupiterTokenInfo(): Promise<TokenInfoMap> {
  const preferredTokenListMode: any = "strict";
  const tokens = await (preferredTokenListMode === "strict"
    ? await fetch("https://token.jup.ag/strict")
    : await fetch("https://token.jup.ag/all")
  ).json();

  // Dynamically import TokenListContainer when needed
  const { TokenListContainer } = await import("@solana/spl-token-registry");

  const res = new TokenListContainer(tokens);
  const list = res.filterByChainId(101).getList();
  const tokenMap = list
    .filter((tokenInfo) => SUPPORTED_TOKENS.includes(tokenInfo.address))
    .reduce((acc, item) => {
      acc.set(item.address, item);
      return acc;
    }, new Map());

  return tokenMap;
}

async function fetchUserTokenAccounts(connection: Connection, walletAddress: PublicKey): Promise<TokenAccountMap> {
  const response = await connection.getParsedTokenAccountsByOwner(
    walletAddress,
    { programId: TOKEN_PROGRAM_ID },
    "confirmed"
  );

  const reducedResult = response.value.map((item: any) => {
    return {
      created: true,
      mint: new PublicKey(item.account.data.parsed.info.mint),
      balance: item.account.data.parsed.info.tokenAmount.uiAmount,
    } as TokenAccount;
  });

  const userTokenAccounts = new Map(
    reducedResult.map((tokenAccount: any) => [tokenAccount.mint.toString(), tokenAccount])
  );
  return userTokenAccounts;
}

async function fetchTokenPrices(mints: PublicKey[]): Promise<Map<string, number>> {
  const prices = await fetchBirdeyePrices(mints);
  return new Map(prices.map((price, index) => [mints[index].toString(), price.toNumber()]));
}

export { createActionBoxStore };
export type { ActionBoxState };
