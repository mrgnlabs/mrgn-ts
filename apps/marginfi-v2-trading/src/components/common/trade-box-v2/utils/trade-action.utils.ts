import { v4 as uuidv4 } from "uuid";
import {
  IndividualFlowError,
  executeTradeAction,
  ExecuteTradeActionProps,
  CalculateLoopingProps,
  ActionMessageType,
  calculateLoopingParams,
  TradeActionTxns,
  getSwapQuoteWithRetry,
  STATIC_SIMULATION_ERRORS,
  deserializeInstruction,
  getAdressLookupTableAccounts,
  MultiStepToastHandle,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BalanceRaw, MarginfiAccount, MarginfiAccountRaw, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import BN from "bn.js";
import {
  addTransactionMetadata,
  bigNumberToWrappedI80F48,
  LUT_PROGRAM_AUTHORITY_INDEX,
  nativeToUi,
  SolanaTransaction,
  uiToNative,
} from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import { ArenaPoolV2Extended } from "~/types/trade-store.types";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { PreviousTxn } from "~/types";

interface ExecuteTradeActionsProps extends ExecuteActionsCallbackProps {
  props: ExecuteTradeActionProps;
}

export const initiateTradeAction = async (
  params: ExecuteTradeActionProps,
  leverage: number,
  activePoolExtended: ArenaPoolV2Extended,
  callbacks: {
    captureEvent?: (event: string, properties?: Record<string, any>) => void;
    setIsActionComplete: (isComplete: boolean) => void;
    setPreviousTxn: (previousTxn: PreviousTxn) => void;
    onComplete?: (txn: PreviousTxn) => void;
    setIsLoading: (isLoading: boolean) => void;
    setAmountRaw: (amountRaw: string) => void;
    retryCallback: (txs: TradeActionTxns, toast: MultiStepToastHandle) => void;
  }
) => {
  const action = async (params: ExecuteTradeActionProps) => {
    await handleExecuteTradeAction({
      props: params,
      captureEvent: (event, properties) => {
        callbacks.captureEvent && callbacks.captureEvent(event, properties);
      },
      setIsComplete: (txnSigs) => {
        callbacks.setIsActionComplete(true);
        callbacks.setPreviousTxn({
          txnType: "TRADING",
          txn: txnSigs[txnSigs.length - 1] ?? "",
          tradingOptions: {
            depositBank: params.depositBank as ActiveBankInfo,
            borrowBank: params.borrowBank as ActiveBankInfo,
            initDepositAmount: params.depositAmount.toString(),
            depositAmount: params.actualDepositAmount,
            borrowAmount: params.borrowAmount.toNumber(),
            leverage: leverage,
            type: params.tradeSide,
            quote: params.actionTxns.actionQuote!,
            entryPrice: activePoolExtended.tokenBank.info.oraclePrice.priceRealtime.price.toNumber(),
          },
        });

        callbacks.onComplete &&
          callbacks.onComplete({
            txn: txnSigs[txnSigs.length - 1] ?? "",
            txnType: "TRADING",
            tradingOptions: {
              depositBank: params.depositBank as ActiveBankInfo,
              borrowBank: params.borrowBank as ActiveBankInfo,
              initDepositAmount: params.depositAmount.toString(),
              depositAmount: params.actualDepositAmount,
              borrowAmount: params.borrowAmount.toNumber(),
              leverage: leverage,
              type: params.tradeSide,
              quote: params.actionTxns.actionQuote!,
              entryPrice: activePoolExtended.tokenBank.info.oraclePrice.priceRealtime.price.toNumber(),
            },
          });
      },
      setError: (error: IndividualFlowError) => {
        const toast = error.multiStepToast as MultiStepToastHandle;
        if (!toast) {
          return;
        }
        const txs = error.actionTxns as TradeActionTxns;
        let retry = undefined;
        if (error.retry && toast && txs) {
          retry = () => callbacks.retryCallback(txs, toast);
        }
        toast.setFailed(error.message, retry);
        callbacks.setIsLoading(false);
      },
      setIsLoading: (isLoading) => callbacks.setIsLoading(isLoading),
    });
  };
  await action(params);
  callbacks.setAmountRaw("");
};

const handleExecuteTradeAction = async ({
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

export async function generateTradeTx(props: CalculateLoopingProps): Promise<TradeActionTxns | ActionMessageType> {
  let swapTx: { quote?: QuoteResponse; tx?: SolanaTransaction; error?: ActionMessageType } | undefined;

  const swapNeeded = props.tradeState === "long";
  if (swapNeeded) {
    console.log("Creating Quote swap transaction...");
    try {
      swapTx = await createSwapTx(
        props,
        {
          slippageBps: props.slippageBps,
        },
        props.marginfiClient.wallet.publicKey,
        props.marginfiClient.provider.connection
      );
      if (swapTx.error) {
        console.error("Quote swap transaction error:", swapTx.error);
        return swapTx.error;
      } else {
        if (!swapTx.tx || !swapTx.quote) {
          return STATIC_SIMULATION_ERRORS.FL_FAILED;
        }
      }
    } catch (error) {
      console.error("Error creating Quote swap transaction:", error);
      return STATIC_SIMULATION_ERRORS.FL_FAILED;
    }
  }

  // Marginfi Account
  let hasMarginfiAccount = !!props.marginfiAccount;
  const hasBalances = props.marginfiAccount?.activeBalances?.length ?? 0 > 0;

  if (hasMarginfiAccount && !hasBalances && props.marginfiAccount) {
    const accountInfo = await props.marginfiClient.provider.connection.getAccountInfo(props.marginfiAccount.address);
    hasMarginfiAccount = accountInfo !== null;
  }

  let accountCreationTx: SolanaTransaction[] = [];
  let finalAccount: MarginfiAccountWrapper | null = props.marginfiAccount;
  if (!hasMarginfiAccount) {
    const { account, tx } = await createMarginfiAccountTx(props);
    finalAccount = account;
    accountCreationTx.push(tx);
  }

  let finalDepositAmount = props.depositAmount;

  if (swapNeeded && !swapTx?.quote) {
    return STATIC_SIMULATION_ERRORS.FL_FAILED;
  } else if (swapNeeded && swapTx?.quote) {
    finalDepositAmount = Number(nativeToUi(swapTx?.quote?.outAmount, props.depositBank.info.state.mintDecimals));
  }

  const result = await calculateLoopingParams({
    ...props,
    setupBankAddresses: [props.borrowBank.address],
    marginfiAccount: finalAccount,
    depositAmount: finalDepositAmount,
  });

  if (result && "actionQuote" in result) {
    console.log("DEBUG: result", {
      hasSwapTx: !!swapTx?.tx,
      hasAccountCreationTx: accountCreationTx.length > 0,
      hasAdditionalTxns: result.additionalTxns?.length > 0,
      result,
    });
    return {
      ...result,
      additionalTxns: [...(swapTx?.tx ? [swapTx.tx] : []), ...accountCreationTx, ...(result.additionalTxns ?? [])],
      marginfiAccount: finalAccount ?? undefined,
    };
  }

  return result;
}

async function createMarginfiAccountTx(
  props: CalculateLoopingProps
): Promise<{ account: MarginfiAccountWrapper; tx: SolanaTransaction }> {
  // if no marginfi account, we need to create one
  console.log("Creating new marginfi account transaction...");
  const authority = props.marginfiAccount?.authority ?? props.marginfiClient.provider.publicKey;

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

export async function createSwapTx(
  props: CalculateLoopingProps,
  jupOpts: { slippageBps: number },
  authority: PublicKey,
  connection: Connection
): Promise<{ quote?: QuoteResponse; tx?: SolanaTransaction; error?: ActionMessageType }> {
  try {
    const jupiterQuoteApi = createJupiterApiClient();

    const swapQuote = await getSwapQuoteWithRetry({
      swapMode: "ExactIn",
      amount: uiToNative(props.depositAmount, 6).toNumber(),
      inputMint: props.borrowBank.info.state.mint.toBase58(),
      outputMint: props.depositBank.info.state.mint.toBase58(),
      slippageBps: jupOpts.slippageBps,
    });

    if (!swapQuote) {
      return { error: STATIC_SIMULATION_ERRORS.FL_FAILED };
    }

    const {
      computeBudgetInstructions,
      swapInstruction,
      setupInstructions,
      cleanupInstruction,
      addressLookupTableAddresses,
    } = await jupiterQuoteApi.swapInstructionsPost({
      swapRequest: {
        quoteResponse: swapQuote,
        userPublicKey: authority.toBase58(),
        programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
      },
    });

    const swapIx = deserializeInstruction(swapInstruction);
    const setupInstructionsIxs = setupInstructions.map((value) => deserializeInstruction(value));
    const cuInstructionsIxs = computeBudgetInstructions.map((value) => deserializeInstruction(value));
    // const cleanupInstructionIx = deserializeInstruction(cleanupInstruction);
    const addressLookupAccounts = await getAdressLookupTableAccounts(connection, addressLookupTableAddresses);
    const finalBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const swapMessage = new TransactionMessage({
      payerKey: authority,
      recentBlockhash: finalBlockhash,
      instructions: [...cuInstructionsIxs, ...setupInstructionsIxs, swapIx],
    });
    const swapTx = addTransactionMetadata(
      new VersionedTransaction(swapMessage.compileToV0Message(addressLookupAccounts)),
      {
        addressLookupTables: addressLookupAccounts,
        type: "SWAP",
      }
    );

    return { quote: swapQuote, tx: swapTx };
  } catch (error) {
    console.error("Error creating swap transaction:", error);
    return { error: STATIC_SIMULATION_ERRORS.FL_FAILED };
  }
}
