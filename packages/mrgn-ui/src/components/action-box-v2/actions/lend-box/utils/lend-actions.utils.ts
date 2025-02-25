import { Keypair, PublicKey } from "@solana/web3.js";

import {
  BalanceRaw,
  MarginfiAccount,
  MarginfiAccountRaw,
  MarginfiAccountWrapper,
  MarginfiClient,
} from "@mrgnlabs/marginfi-client-v2";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { bigNumberToWrappedI80F48, SolanaTransaction } from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  ActionProcessingError,
  ActionTxns,
  isWholePosition,
  STATIC_SIMULATION_ERRORS,
} from "@mrgnlabs/mrgn-utils";

import { BN } from "@coral-xyz/anchor";
import BigNumber from "bignumber.js";

export async function generateActionTxns(props: {
  marginfiAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient;
  bank: ExtendedBankInfo;
  lendMode: ActionType;
  stakeAccount?: PublicKey;
  amount: number;
}): Promise<{ transactions: SolanaTransaction[]; finalAccount: MarginfiAccountWrapper }> {
  let accountCreationTx: SolanaTransaction | null = null;
  let account: MarginfiAccountWrapper | null = props.marginfiAccount;

  if (!account && props.lendMode === ActionType.Deposit) {
    const { account: newAccount, tx } = await createMarginfiAccountTx({
      marginfiAccount: props.marginfiAccount,
      marginfiClient: props.marginfiClient,
    });
    account = newAccount;
    accountCreationTx = tx;
  }

  if (!account) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED);
  }

  switch (props.lendMode) {
    case ActionType.Deposit:
      let depositTx: SolanaTransaction;
      if (account && props.bank.info.rawBank.config.assetTag === 2) {
        if (!props.stakeAccount || !props.bank.meta.stakePool?.validatorVoteAccount) {
          throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.NATIVE_STAKE_NOT_FOUND);
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
      return {
        transactions: [...(accountCreationTx ? [accountCreationTx] : []), depositTx],
        finalAccount: account,
      };
    case ActionType.Borrow:
      const borrowTxObject = await account.makeBorrowTx(props.amount, props.bank.address, {
        createAtas: true,
        wrapAndUnwrapSol: false,
      });

      return {
        transactions: borrowTxObject.transactions,
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
          transactions: withdrawTx.transactions,
          finalAccount: account,
        };
      } else {
        const withdrawTxObject = await account.makeWithdrawTx(
          props.amount,
          props.bank.address,
          props.bank.isActive && isWholePosition(props.bank, props.amount)
        );

        return {
          transactions: withdrawTxObject.transactions,
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
        transactions: [repayTx],
        finalAccount: account,
      };
    default:
      throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.ACTION_TYPE_CHECK);
  }
}

async function createMarginfiAccountTx(props: {
  marginfiAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient;
}): Promise<{ account: MarginfiAccountWrapper; tx: SolanaTransaction }> {
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
