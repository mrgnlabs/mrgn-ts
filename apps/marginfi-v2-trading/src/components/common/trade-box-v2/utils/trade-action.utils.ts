import { v4 as uuidv4 } from "uuid";
import {
  IndividualFlowError,
  executeTradeAction,
  ExecuteTradeActionProps,
  CalculateLoopingProps,
  ActionMessageType,
  calculateLoopingParams,
  TradeActionTxns,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  BalanceRaw,
  MarginfiAccount,
  MarginfiAccountRaw,
  MarginfiAccountWrapper,
  MarginfiClient,
} from "@mrgnlabs/marginfi-client-v2";
import BN from "bn.js";
import { bigNumberToWrappedI80F48, SolanaTransaction, WrappedI80F48 } from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";

interface ExecuteTradeActionsProps extends ExecuteActionsCallbackProps {
  props: ExecuteTradeActionProps;
}

export const handleExecuteTradeAction = async ({
  props,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: ExecuteTradeActionsProps) => {
  try {
    setIsLoading(true);
    const attemptUuid = uuidv4();
    captureEvent(`user_trade_initiate`, {
      uuid: attemptUuid,
      tokenSymbol: props.borrowBank.meta.tokenSymbol,
      tokenName: props.borrowBank.meta.tokenName,
      amount: props.depositAmount,
      priorityFee: props.processOpts?.priorityFeeMicro ?? 0,
    });

    const txnSig = await executeTradeAction(props);

    setIsLoading(false);

    if (txnSig) {
      setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
      captureEvent(`user_trade`, {
        uuid: attemptUuid,
        tokenSymbol: props.borrowBank.meta.tokenSymbol,
        tokenName: props.borrowBank.meta.tokenName,
        amount: props.depositAmount,
        txn: txnSig!,
        priorityFee: props.processOpts?.priorityFeeMicro ?? 0,
      });
    }
  } catch (error) {
    setError(error as IndividualFlowError);
  }
};

interface GenerateTradeTxProps extends CalculateLoopingProps {
  authority: PublicKey;
}

export async function generateTradeTx(props: GenerateTradeTxProps): Promise<TradeActionTxns | ActionMessageType> {
  const hasMarginfiAccount = !!props.marginfiAccount;
  let accountCreationTx: SolanaTransaction | undefined;

  let finalAccount: MarginfiAccountWrapper | null = props.marginfiAccount;

  if (!hasMarginfiAccount) {
    // if no marginfi account, we need to create one
    const marginfiAccountKeypair = Keypair.generate();

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
      authority: props.authority,
      lendingAccount: { balances: dummyBalances },
      accountFlags: new BN([0, 0, 0]),
    };

    const account = new MarginfiAccount(marginfiAccountKeypair.publicKey, rawAccount);

    const wrappedAccount = new MarginfiAccountWrapper(marginfiAccountKeypair.publicKey, props.marginfiClient, account);

    finalAccount = wrappedAccount;

    accountCreationTx = await props.marginfiClient.createMarginfiAccountTx({ accountKeypair: marginfiAccountKeypair });
  }
  const result = await calculateLoopingParams({ ...props, marginfiAccount: finalAccount });

  if (result && "actionQuote" in result) {
    return {
      ...result,
      additionalTxns: [...(result.additionalTxns ?? [])],
      accountCreationTx: accountCreationTx ?? undefined,
    };
  }

  return result;
}
