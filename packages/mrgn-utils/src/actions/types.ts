import { BN } from "@coral-xyz/anchor";
import { QuoteResponse } from "@jup-ag/api";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import * as solanaStakePool from "@solana/spl-stake-pool";
import BigNumber from "bignumber.js";

import { Wallet } from "@mrgnlabs/mrgn-common";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { WalletContextStateOverride } from "../wallet";

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
  actionTxn: VersionedTransaction | Transaction | null;
  additionalTxns: (VersionedTransaction | Transaction)[];
}

export interface LoopActionTxns extends ActionTxns {
  actionQuote: QuoteResponse | null;
  lastValidBlockHeight?: number;
  actualDepositAmount: number;
  borrowAmount: BigNumber;
}

export interface RepayCollatActionTxns extends ActionTxns {
  actionQuote: QuoteResponse | null;
  lastValidBlockHeight?: number;
} //

export interface StakeActionTxns extends ActionTxns {
  actionQuote: QuoteResponse | null;
  lastValidBlockHeight?: number;
} // TOOD: implement this as actionSummary type

export type RepayWithCollatOptions = {
  repayCollatQuote: QuoteResponse;
  feedCrankTxs: VersionedTransaction[];
  repayCollatTxn: VersionedTransaction | null;
  withdrawAmount: number;
  depositBank: ExtendedBankInfo;
  connection: Connection;
};

export type LoopingOptions = {
  loopingQuote: QuoteResponse;
  feedCrankTxs: VersionedTransaction[];
  loopingTxn: VersionedTransaction | null;
  borrowAmount: BigNumber;
  loopingBank: ExtendedBankInfo;
  connection: Connection;
};

export type MarginfiActionParams = {
  marginfiClient: MarginfiClient | null;
  bank: ExtendedBankInfo;
  actionType: ActionType;
  amount: number;
  nativeSolBalance: number;
  marginfiAccount: MarginfiAccountWrapper | null;
  actionTxns?: ActionTxns;
  repayWithCollatOptions?: RepayWithCollatOptions; // deprecated
  loopingOptions?: LoopingOptions; // deprecated
  walletContextState?: WalletContextState | WalletContextStateOverride;
  priorityFee?: number;
  theme?: "light" | "dark";
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

export interface LoopingObject {
  loopingTxn: VersionedTransaction | null;
  feedCrankTxs: VersionedTransaction[];
  quote: QuoteResponse;
  actualDepositAmount: number;
  borrowAmount: BigNumber;
  priorityFee: number;
}
