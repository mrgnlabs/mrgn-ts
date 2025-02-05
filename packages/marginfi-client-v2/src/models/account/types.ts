import {
  Amount,
  ExtendedV0Transaction,
  SolanaTransaction,
  TransactionOptions,
  TransactionType,
} from "@mrgnlabs/mrgn-common";
import { PublicKey, TransactionInstruction, AddressLookupTableAccount } from "@solana/web3.js";
import { MakeWithdrawIxOpts, MakeRepayIxOpts, MakeDepositIxOpts, MakeBorrowIxOpts } from "./pure";
import { ProcessTransactionsClientOpts } from "../../services";

export interface LoopProps extends LoopTxProps {
  processOpts?: ProcessTransactionsClientOpts;
  txOpts?: TransactionOptions;
}

export type LoopTxProps = {
  /** Amount to deposit */
  depositAmount: Amount;
  /** Amount to borrow */
  borrowAmount: Amount;
  /** Bank address to deposit into */
  depositBankAddress: PublicKey;
  /** Bank address to borrow from */
  borrowBankAddress: PublicKey;
  /** Swap configuration */
  swap: {
    /** Instructions for swapping borrowed amount */
    instructions: TransactionInstruction[];
    /** Address lookup tables needed for swap instructions */
    lookupTables: AddressLookupTableAccount[];
  };
  /** Optional recent blockhash */
  blockhash?: string;
  /** Optional deposit configuration */
  depositOpts?: MakeDepositIxOpts;
  /** Optional borrow configuration */
  borrowOpts?: MakeBorrowIxOpts;
  /** Optional setup banks addresses */
  setupBankAddresses?: PublicKey[];
};

export interface RepayWithCollateralProps extends RepayWithCollateralTxProps {
  processOpts?: ProcessTransactionsClientOpts;
  txOpts?: TransactionOptions;
}

export type RepayWithCollateralTxProps = {
  /** Amount to repay */
  repayAmount: Amount;
  /** Amount of collateral to withdraw */
  withdrawAmount: Amount;
  /** Bank address where the loan is being repaid */
  borrowBankAddress: PublicKey;
  /** Bank address where collateral is being withdrawn from */
  depositBankAddress: PublicKey;
  /** Whether to withdraw all collateral from deposit bank */
  withdrawAll?: boolean;
  /** Whether to repay entire loan amount */
  repayAll?: boolean;
  /** Swap configuration */
  swap: {
    instructions: TransactionInstruction[];
    lookupTables: AddressLookupTableAccount[];
  };
  /** Optional recent blockhash */
  blockhash?: string;
  /** Optional withdraw configuration */
  withdrawOpts?: MakeWithdrawIxOpts;
  /** Optional repay configuration */
  repayOpts?: MakeRepayIxOpts;
};

export interface TransactionBuilderResult {
  transactions: SolanaTransaction[];
  actionTxIndex: number;
}

export interface FlashloanActionResult extends TransactionBuilderResult {
  /** Whether transaction size exceeds limits */
  txOverflown: boolean;
}
