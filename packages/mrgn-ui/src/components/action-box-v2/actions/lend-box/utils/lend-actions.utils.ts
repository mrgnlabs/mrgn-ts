import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { v4 as uuidv4 } from "uuid";

import { BalanceRaw, MarginfiAccount, MarginfiAccountRaw, MarginfiAccountWrapper, MarginfiClient, ProcessTransactionsClientOpts } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { bigNumberToWrappedI80F48, SolanaTransaction } from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  ActionTxns,
  closeBalance,
  executeLendingAction,
  IndividualFlowError,
  isWholePosition,
  MarginfiActionParams,
  MultiStepToastHandle,
  STATIC_SIMULATION_ERRORS,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { BN } from "@coral-xyz/anchor";
import BigNumber from "bignumber.js";

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

export async function generateActionTxns(props: {
  marginfiAccount: MarginfiAccountWrapper | null,
  marginfiClient: MarginfiClient,
  bank: ExtendedBankInfo,
  lendMode: ActionType,
  stakeAccount?: PublicKey,
  amount: number,
}): Promise<{ transactions: ActionTxns , finalAccount: MarginfiAccountWrapper } | ActionMessageType> {
  let actionTxn: SolanaTransaction;
  let accountCreationTx: SolanaTransaction[] = [];
  let account: MarginfiAccountWrapper | null = props.marginfiAccount;

  console.log("account", account);

  if (!account && props.lendMode === ActionType.Deposit) {
    console.log("creating new account");
    const { account: newAccount, tx } = await createMarginfiAccountTx({
      marginfiAccount: props.marginfiAccount,
      marginfiClient: props.marginfiClient,
    });

    console.log("newAccount", newAccount);
    console.log("tx", tx);
    account = newAccount;
    accountCreationTx.push(tx);
  }

  if (!account) {
    return STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED;
    }
    
    switch (props.lendMode) {
      case ActionType.Deposit:
        let depositTx: SolanaTransaction;

        if (account && props.bank.info.rawBank.config.assetTag === 2) {
          if (!props.stakeAccount || !props.bank.meta.stakePool?.validatorVoteAccount) {
            return STATIC_SIMULATION_ERRORS.NATIVE_STAKE_NOT_FOUND;
          }
  
          depositTx = await account.makeDepositStakedTx(
            props.amount,
            props.bank.address,
            props.stakeAccount,
            props.bank.meta.stakePool?.validatorVoteAccount
          );
        } else {
          depositTx = await account.makeDepositTx(props.amount, props.bank.address);
        }

        depositTx = await marginfiAccount.makeDepositStakedTx(
          amount,
          bank.address,
          stakeAccount,
          bank.meta.stakePool?.validatorVoteAccount
        );
      } else {
        depositTx = await marginfiAccount.makeDepositTx(amount, bank.address);
      }

      return {
        transactions: [depositTx],
      };
    case ActionType.Borrow:
      const borrowTxObject = await marginfiAccount.makeBorrowTx(amount, bank.address);
      return {
        transactions: borrowTxObject.transactions,
      };
    case ActionType.Withdraw:
      if (bank.info.rawBank.config.assetTag === 2) {
        const withdrawTx = await marginfiAccount.makeWithdrawStakedTx(
          amount,
          bank.address,
          bank.isActive && isWholePosition(bank, amount)
        );
        return {
          transactions:{
            transactions: accountCreationTx ?  [...accountCreationTx, depositTx] : [depositTx],  
          },
          finalAccount: account,
        }
      case ActionType.Borrow:
        const borrowTxObject = await account.makeBorrowTx(props.amount, props.bank.address, {
          createAtas: true,
          wrapAndUnwrapSol: false,
        });
        return {
          transactions: {
            transactions: borrowTxObject.transactions,
          },
          finalAccount: account,
        };
      case ActionType.Withdraw:
        if (props.bank.info.rawBank.config.assetTag === 2) {
          const withdrawTx = await account.makeWithdrawStakedTx(
            props.amount,
            props.bank.address,
            props.bank.isActive && isWholePosition(props.bank, props.amount)
          );
          return {
            transactions: {
              transactions: withdrawTx.transactions,
            },
            finalAccount: account,
          };
        } else {
          const withdrawTxObject = await account.makeWithdrawTx(
            props.amount,
            props.bank.address,
            props.bank.isActive && isWholePosition(props.bank, props.amount)
          );
  
          return {
            transactions: {
              transactions: withdrawTxObject.transactions,
            },
            finalAccount: account,
          };
        }
      case ActionType.Repay:
        const repayTx = await account.makeRepayTx(
          props.amount,
          props.bank.address,
          props.bank.isActive && isWholePosition(props.bank, props.amount)
        );
        return {
          transactions: {
            transactions: [repayTx],
          },
          finalAccount: account,
        };
      default:
        return STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED;
    }  
}

async function createMarginfiAccountTx(
  props: {
    marginfiAccount : MarginfiAccountWrapper | null
    marginfiClient: MarginfiClient  
  }
): Promise<{ account: MarginfiAccountWrapper; tx: SolanaTransaction }> {
  const authority = props.marginfiAccount?.authority ?? props.marginfiClient.provider.publicKey;
  const marginfiAccountKeypair = Keypair.generate();

  // create a dummy account with 15 empty balances to be used in other transactions
  const dummyWrappedI80F48 = bigNumberToWrappedI80F48(new BigNumber(0));
  const dummyBalances: BalanceRaw[] = Array(15).fill({
    active: false,
    bankPk: new PublicKey("11111111111111111111111111111111"),
    assetShares: dummyWrappedI80F48,
    liabilityShares: dummyWrappedI80F48,
    emissionsOutstanding: dummyWrappedI80F48,
    lastUpdate: new BN(0),
  });
  const rawAccount: MarginfiAccountRaw = {
    group: props.marginfiClient.group.address,
    authority: authority,
    lendingAccount: { balances: dummyBalances },
    accountFlags: new BN([0, 0, 0]),
  };

  const account = new MarginfiAccount(marginfiAccountKeypair.publicKey, rawAccount);

  const wrappedAccount = new MarginfiAccountWrapper(marginfiAccountKeypair.publicKey, props.marginfiClient, account);

  return {
    account: wrappedAccount,
    tx: await props.marginfiClient.createMarginfiAccountTx({ accountKeypair: marginfiAccountKeypair }),
  };
}