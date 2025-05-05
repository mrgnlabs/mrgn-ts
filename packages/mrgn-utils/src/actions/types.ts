import { BN } from "@coral-xyz/anchor";
import { QuoteResponse } from "@jup-ag/api";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import * as solanaStakePool from "@solana/spl-stake-pool";
import BigNumber from "bignumber.js";

import { SolanaTransaction, TransactionBroadcastType, TransactionOptions, Wallet } from "@mrgnlabs/mrgn-common";
import { MarginfiAccountWrapper, MarginfiClient, ProcessTransactionsClientOpts } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { WalletContextStateOverride } from "../wallet";
import { QuoteResponseMeta } from "../types";
import { MultiStepToastController } from "@mrgnlabs/mrgn-toasts";

export enum RepayType {
  RepayRaw = "Repay",
  RepayCollat = "Collateral Repay",
}

export enum LstType {
  Token = "Token",
  Native = "Native Stake",
}

export enum YbxType {
  MintYbx = "Mint YBX",
  WithdrawCollat = "Withdraw Collateral",
  AddCollat = "Add Collateral",
  RepayYbx = "Repay",
}

export type ActionMessageUIType = "WARNING" | "ERROR" | "INFO";
export interface ActionMessageType {
  isEnabled: boolean;
  actionMethod?: ActionMessageUIType;
  description?: string;
  link?: string;
  linkText?: string;
  retry?: boolean;
  code?: number;
  action?: {
    bank: ExtendedBankInfo;
    type: ActionType;
  };
}

export interface StakeData {
  address: PublicKey;
  lamports: BN;
  isActive: boolean;
  validatorVoteAddress: PublicKey;
}

export interface LstData {
  poolAddress: PublicKey;
  tvl: number;
  projectedApy: number;
  lstSolValue: number;
  solDepositFee: number;
  accountData: solanaStakePool.StakePool;
  validatorList: PublicKey[];
  updateRequired: boolean;
  lastUpdateEpoch: string;
}

export interface ActionTxns {
  transactions: SolanaTransaction[];
}

export interface LoopActionTxns extends ActionTxns {
  actionQuote: QuoteResponse | null;
  actualDepositAmount: number;
  borrowAmount: BigNumber;
}

export interface TradeActionTxns extends LoopActionTxns {
  marginfiAccount?: MarginfiAccountWrapper;
}

export interface ClosePositionActionTxns extends ActionTxns {
  actionQuote: QuoteResponse | null;
  maxAmount: number;
  groupKey?: PublicKey;
  closeTransactions?: SolanaTransaction[];
}

export interface RepayActionTxns extends ActionTxns {
  actionQuote?: QuoteResponse | null;
  lastValidBlockHeight?: number;
}

export interface StakeActionTxns extends ActionTxns {
  actionQuote: QuoteResponse | null;
  lastValidBlockHeight?: number;
} // TOOD: implement this as actionSummary type

export interface DepositSwapActionTxns extends ActionTxns {
  actionQuote: QuoteResponse | null;
}

export interface CalculateTradingProps extends CalculateLoopingProps {
  tradeState: "long" | "short";
}

export interface CalculateLoopingProps
  extends Pick<
    LoopingProps,
    "marginfiAccount" | "borrowBank" | "depositBank" | "depositAmount" | "connection" | "overrideInferAccounts"
  > {
  targetLeverage: number;
  marginfiClient: MarginfiClient;
  slippageBps: number;
  slippageMode: "DYNAMIC" | "FIXED";
  platformFeeBps: number;
  setupBankAddresses?: PublicKey[];
}

export interface CalculateRepayCollateralProps
  extends Pick<
    RepayWithCollatProps,
    "marginfiAccount" | "borrowBank" | "depositBank" | "withdrawAmount" | "connection"
  > {
  slippageBps: number;
  slippageMode: "DYNAMIC" | "FIXED";
  platformFeeBps: number;
}

export interface CalculateClosePositionProps
  extends Pick<ClosePositionProps, "marginfiAccount" | "depositBank" | "borrowBank" | "connection"> {
  slippageBps: number;
  slippageMode: "DYNAMIC" | "FIXED";
  platformFeeBps: number;
}

export type ClosePositionProps = {
  marginfiAccount: MarginfiAccountWrapper;
  depositBank: ActiveBankInfo;
  borrowBank: ActiveBankInfo;
  quote: QuoteResponse;
  connection: Connection;
};

export type RepayProps = {
  marginfiAccount: MarginfiAccountWrapper;
  repayAmount: number;
  withdrawAmount: number;
  selectedBank: ExtendedBankInfo;
  selectedSecondaryBank: ExtendedBankInfo;
  quote: QuoteResponse | null;
  connection: Connection;
  multiStepToast?: MultiStepToastController;
};

export type RepayWithCollatProps = {
  marginfiAccount: MarginfiAccountWrapper;
  repayAmount: number;
  withdrawAmount: number; // previously amount
  borrowBank: ExtendedBankInfo; // previously bank
  depositBank: ExtendedBankInfo;
  quote: QuoteResponse;
  connection: Connection;

  multiStepToast?: MultiStepToastController;
};

// deprecated
export interface LoopingObject {
  loopingTxn: VersionedTransaction | null;
  feedCrankTxs: VersionedTransaction[];
  quote: QuoteResponse;
  actualDepositAmount: number;
  borrowAmount: BigNumber;
  priorityFee: number;
}

export type LoopingProps = {
  marginfiAccount: MarginfiAccountWrapper | null;
  depositAmount: number;
  borrowAmount: BigNumber;
  actualDepositAmount: number;
  depositBank: ExtendedBankInfo;
  borrowBank: ExtendedBankInfo;
  quote: QuoteResponse;
  connection: Connection;
  setupBankAddresses?: PublicKey[];
  multiStepToast?: MultiStepToastController;
  overrideInferAccounts?: {
    group?: PublicKey;
    authority?: PublicKey;
  };
};

export type MarginfiActionParams = {
  marginfiClient: MarginfiClient | null;
  marginfiAccount: MarginfiAccountWrapper | null;
  bank: ExtendedBankInfo;
  actionType: ActionType;
  amount: number;
  nativeSolBalance: number;

  actionTxns?: ActionTxns;
  walletContextState?: WalletContextState | WalletContextStateOverride;
  processOpts?: ProcessTransactionsClientOpts;
  txOpts?: TransactionOptions;

  multiStepToast?: MultiStepToastController;
};

export type LstActionParams = {
  actionMode: ActionType;
  marginfiClient: MarginfiClient;
  amount: number;
  nativeSolBalance: number;
  connection: Connection;
  wallet: Wallet;
  lstData: LstData;
  bank: ExtendedBankInfo | null;
  selectedStakingAccount: StakeData | null;
  quoteResponseMeta: QuoteResponseMeta | null;
  priorityFee?: number;
  theme?: "light" | "dark";
};

export class ActionProcessingError extends Error {
  public readonly details: ActionMessageType;

  constructor(details: ActionMessageType) {
    super(details.description || "Action processing failed");
    this.name = "ActionProcessingError";
    this.details = details;
  }
}

export class IndividualFlowError extends Error {
  public readonly actionTxns?: ActionTxns;
  public readonly multiStepToast?: MultiStepToastController;
  public readonly retry: boolean;

  constructor(
    message: string,
    options?: {
      failedTxns?: ActionTxns;
      multiStepToast?: MultiStepToastController;
      retry?: boolean;
    }
  ) {
    super(message);
    this.name = "IndividualFlowError";
    this.actionTxns = options?.failedTxns;
    this.multiStepToast = options?.multiStepToast;
    this.retry = options?.retry ?? false;

    Object.setPrototypeOf(this, IndividualFlowError.prototype);
  }
}
