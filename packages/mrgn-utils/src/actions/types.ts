import { BN } from "@coral-xyz/anchor";
import { QuoteResponse } from "@jup-ag/api";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
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

export type ActionMethodType = "WARNING" | "ERROR" | "INFO";
export interface ActionMethod {
  isEnabled: boolean;
  actionMethod?: ActionMethodType;
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
}

export type RepayWithCollatOptions = {
  repayCollatQuote: QuoteResponse;
  bundleTipTxn: VersionedTransaction | null;
  repayCollatTxn: VersionedTransaction | null;
  withdrawAmount: number;
  depositBank: ExtendedBankInfo;
  connection: Connection;
};

export type LoopingOptions = {
  loopingQuote: QuoteResponse;
  bundleTipTxn: VersionedTransaction | null;
  loopingTxn: VersionedTransaction | null;
  borrowAmount: BigNumber;
  loopingBank: ExtendedBankInfo;
  connection: Connection;
};

export type MarginfiActionParams = {
  mfiClient: MarginfiClient | null;
  bank: ExtendedBankInfo;
  actionType: ActionType;
  amount: number;
  nativeSolBalance: number;
  marginfiAccount: MarginfiAccountWrapper | null;
  repayWithCollatOptions?: RepayWithCollatOptions;
  loopingOptions?: LoopingOptions;
  walletContextState?: WalletContextState | WalletContextStateOverride;
  priorityFee?: number;
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
};
