import {
  Connection,
  StakeProgram,
  StakeAuthorizationLayout,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import { v4 as uuidv4 } from "uuid";

import { MarginfiAccountWrapper, ProcessTransactionsClientOpts } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionType,
  ExtendedBankInfo,
  getStakeAccountsCached,
  SinglePoolInstruction,
  findPoolAddress,
  findPoolMintAddress,
  findPoolStakeAuthorityAddress,
} from "@mrgnlabs/marginfi-v2-ui-state";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  SolanaTransaction,
  TransactionBroadcastType,
  addTransactionMetadata,
  SYSVAR_CLOCK_ID,
} from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  closeBalance,
  executeLendingAction,
  IndividualFlowError,
  isWholePosition,
  MarginfiActionParams,
  MultiStepToastHandle,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";

interface ExecuteLendingActionsProps extends ExecuteActionsCallbackProps {
  params: MarginfiActionParams;
}

export const handleExecuteLendingAction = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: ExecuteLendingActionsProps) => {
  try {
    const { actionType, bank, amount, processOpts } = params;

    setIsLoading(true);
    const attemptUuid = uuidv4();
    captureEvent(`user_${actionType.toLowerCase()}_initiate`, {
      uuid: attemptUuid,
      tokenSymbol: bank.meta.tokenSymbol,
      tokenName: bank.meta.tokenName,
      amount,
      processOpts: processOpts?.priorityFeeMicro,
    });

    const txnSig = await executeLendingAction(params);

    setIsLoading(false);

    if (txnSig) {
      setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
      captureEvent(`user_${actionType.toLowerCase()}`, {
        uuid: attemptUuid,
        tokenSymbol: bank.meta.tokenSymbol,
        tokenName: bank.meta.tokenName,
        amount: amount,
        txn: txnSig!,
        priorityFee: processOpts?.priorityFeeMicro,
      });
    }
  } catch (error) {
    setError(error as IndividualFlowError);
  }
};

export interface HandleCloseBalanceParamsProps {
  bank: ExtendedBankInfo;
  marginfiAccount: MarginfiAccountWrapper | null;
  processOpts?: ProcessTransactionsClientOpts;
  multiStepToast?: MultiStepToastHandle;
}

interface HandleCloseBalanceProps extends ExecuteActionsCallbackProps {
  params: HandleCloseBalanceParamsProps;
}

export const handleExecuteCloseBalance = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: HandleCloseBalanceProps) => {
  try {
    const { bank, marginfiAccount, processOpts } = params;

    setIsLoading(true);
    const attemptUuid = uuidv4();
    captureEvent(`user_close_balance_initiate`, {
      uuid: attemptUuid,
      tokenSymbol: bank.meta.tokenSymbol,
      tokenName: bank.meta.tokenName,
      amount: 0,
      priorityFee: processOpts?.priorityFeeMicro,
    });

    const txnSig = await closeBalance({
      marginfiAccount: marginfiAccount,
      bank: bank,
      processOpts,
      multiStepToast: params.multiStepToast,
    });
    setIsLoading(false);

    if (txnSig) {
      setIsComplete([...txnSig]);
      captureEvent(`user_close_balance`, {
        uuid: attemptUuid,
        tokenSymbol: bank.meta.tokenSymbol,
        tokenName: bank.meta.tokenName,
        amount: 0,
        txn: txnSig!,
        priorityFee: processOpts?.priorityFeeMicro,
      });
    }
  } catch (error) {
    setError(error as IndividualFlowError);
  }
};

export async function calculateLendingTransaction(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo,
  actionMode: ActionType,
  amount: number,
  connection?: Connection
): Promise<
  | {
      actionTxn: SolanaTransaction;
      additionalTxns: SolanaTransaction[];
    }
  | ActionMessageType
> {
  switch (actionMode) {
    case ActionType.Deposit:
      let depositTx: SolanaTransaction;
      let lstAta: PublicKey | undefined;
      const ix: TransactionInstruction[] = [];

      if (marginfiAccount && connection && bank.info.rawBank.config.assetTag === 2) {
        console.log("Depositing into staked asset bank");

        const stakeAccounts = await getStakeAccountsCached(marginfiAccount.authority);
        const stakeAccount = stakeAccounts.find((stakeAccount) =>
          stakeAccount.poolMintKey.equals(bank.info.state.mint)
        );

        if (!stakeAccount) {
          throw new Error("No stake account found for this staked asset bank");
        }

        depositTx = await marginfiAccount.makeDepositStakedTx(
          amount,
          bank.address,
          new PublicKey(stakeAccount.accounts[0].pubkey),
          stakeAccount.validator
        );

        // const stakeAccountPk = new PublicKey(stakeAccount.accounts[0].pubkey);
        // const pool = findPoolAddress(stakeAccount.validator);
        // const lstMint = findPoolMintAddress(pool);
        // const auth = findPoolStakeAuthorityAddress(pool);
        // const lstAta = getAssociatedTokenAddressSync(lstMint, marginfiAccount.authority);

        // const accountInfo = await connection.getAccountInfo(lstAta);
        // if (!accountInfo) {
        //   ix.push(
        //     createAssociatedTokenAccountInstruction(
        //       marginfiAccount.authority,
        //       lstAta,
        //       marginfiAccount.authority,
        //       lstMint
        //     )
        //   );
        // }

        // const authorizeStakerIxes = StakeProgram.authorize({
        //   stakePubkey: stakeAccountPk,
        //   authorizedPubkey: marginfiAccount.authority,
        //   newAuthorizedPubkey: auth,
        //   stakeAuthorizationType: StakeAuthorizationLayout.Staker,
        // }).instructions;

        // const authorizeWithdrawIxes = StakeProgram.authorize({
        //   stakePubkey: stakeAccountPk,
        //   authorizedPubkey: marginfiAccount.authority,
        //   newAuthorizedPubkey: auth,
        //   stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
        // }).instructions;

        // const depositIx: TransactionInstruction = await SinglePoolInstruction.depositStake(
        //   pool,
        //   stakeAccountPk,
        //   lstAta,
        //   marginfiAccount.authority
        // );

        // // loop through authorizeStakerIxes and authorizeWithdrawIxes keys and print them out
        // console.log("Authorize staker keys");
        // authorizeStakerIxes[0].keys = authorizeStakerIxes[0].keys.map((key) => {
        //   console.log(key.pubkey.toBase58(), key.isWritable ? "writable" : "not writable");
        //   if (key.pubkey.equals(SYSVAR_CLOCK_ID) && key.isWritable) {
        //     console.log("overwriting SYSVAR_CLOCK_ID");
        //     key.isWritable = false;
        //     console.log(key.pubkey.toBase58(), key.isWritable ? "writable" : "not writable");
        //   }
        //   return key;
        // });
        // console.log("Authorize withdraw keys");
        // authorizeWithdrawIxes[0].keys = authorizeWithdrawIxes[0].keys.map((key) => {
        //   console.log(key.pubkey.toBase58(), key.isWritable ? "writable" : "not writable");
        //   if (key.pubkey.equals(SYSVAR_CLOCK_ID) && key.isWritable) {
        //     console.log("overwriting SYSVAR_CLOCK_ID");
        //     key.isWritable = false;
        //     console.log(key.pubkey.toBase58(), key.isWritable ? "writable" : "not writable");
        //   }
        //   return key;
        // });

        // ix.push(...authorizeStakerIxes, ...authorizeWithdrawIxes, depositIx);

        // console.log("Staked asset bank params");
        // console.log(stakeAccount);
        // console.log(pool.toBase58());
        // console.log(lstMint.toBase58());
        // console.log(auth.toBase58());
        // console.log(lstAta.toBase58());
        // console.log(ix);
      } else {
        depositTx = await marginfiAccount.makeDepositTx(amount, bank.address);
      }

      // depositTx = await marginfiAccount.makeDepositTx(amount, bank.address, {
      //   stakedLstAta: lstAta,
      //   ixs: ix,
      // });

      // depositTx = await marginfiAccount.makeDepositStakedTx(
      //   amount,
      //   bank.address,
      //   stakeAccountPk,
      //   stakeAccount.validator
      // );

      return {
        actionTxn: depositTx,
        additionalTxns: [],
      };
    case ActionType.Borrow:
      const borrowTxObject = await marginfiAccount.makeBorrowTx(amount, bank.address, {
        createAtas: true,
        wrapAndUnwrapSol: false,
      });
      return {
        actionTxn: borrowTxObject.borrowTx,
        additionalTxns: borrowTxObject.feedCrankTxs,
      };
    case ActionType.Withdraw:
      const withdrawTxObject = await marginfiAccount.makeWithdrawTx(
        amount,
        bank.address,
        bank.isActive && isWholePosition(bank, amount)
      );
      return {
        actionTxn: withdrawTxObject.withdrawTx,
        additionalTxns: withdrawTxObject.feedCrankTxs,
      };
    case ActionType.Repay:
      const repayTx = await marginfiAccount.makeRepayTx(
        amount,
        bank.address,
        bank.isActive && isWholePosition(bank, amount)
      );
      return {
        actionTxn: repayTx,
        additionalTxns: [], // bundle tip ix is in repayTx
      };
    default:
      throw new Error("Unknown action mode");
  }
}
