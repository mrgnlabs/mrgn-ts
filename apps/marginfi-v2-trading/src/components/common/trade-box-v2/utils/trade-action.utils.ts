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
  getFeeAccount,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { AccountInfo, Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import {
  BalanceRaw,
  makeUnwrapSolIx,
  MarginfiAccount,
  MarginfiAccountRaw,
  MarginfiAccountWrapper,
  MarginfiClient,
  TOKEN_2022_MINTS,
} from "@mrgnlabs/marginfi-client-v2";
import BN from "bn.js";
import {
  addTransactionMetadata,
  bigNumberToWrappedI80F48,
  LUT_PROGRAM_AUTHORITY_INDEX,
  nativeToUi,
  SolanaTransaction,
  uiToNative,
  USDC_MINT,
  WrappedI80F48,
} from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";

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

export async function generateTradeTx(props: CalculateLoopingProps): Promise<TradeActionTxns | ActionMessageType> {
  // USDC Swap tx
  let swapTx: { quote?: QuoteResponse; tx?: SolanaTransaction; error?: ActionMessageType } | undefined;

  const swapNeeded = props.depositBank.meta.tokenSymbol !== "USDC";
  if (swapNeeded) {
    console.log("Creating swap transaction...");
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
        console.error("USDC swap transaction error:", swapTx.error);
        return swapTx.error;
      } else {
        if (!swapTx.tx || !swapTx.quote) {
          return STATIC_SIMULATION_ERRORS.FL_FAILED;
        }
      }
    } catch (error) {
      console.error("Error creating USDC swap transaction:", error);
      return STATIC_SIMULATION_ERRORS.FL_FAILED;
    }
  }

  // Marginfi Account
  const hasMarginfiAccount = !!props.marginfiAccount;
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
      inputMint: USDC_MINT.toBase58(),
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
