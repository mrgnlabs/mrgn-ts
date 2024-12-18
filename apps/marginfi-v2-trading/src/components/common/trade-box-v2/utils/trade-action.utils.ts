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
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import {
  BalanceRaw,
  makeUnwrapSolIx,
  MarginfiAccount,
  MarginfiAccountRaw,
  MarginfiAccountWrapper,
  MarginfiClient,
} from "@mrgnlabs/marginfi-client-v2";
import BN from "bn.js";
import {
  addTransactionMetadata,
  bigNumberToWrappedI80F48,
  LUT_PROGRAM_AUTHORITY_INDEX,
  nativeToUi,
  SolanaTransaction,
  uiToNative,
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
  const swapNeeded = props.depositBank.meta.tokenSymbol !== "USDC";
  let swapTx: { quote: QuoteResponse; tx: VersionedTransaction } | undefined;
  if (swapNeeded) {
    console.log("Creating swap transaction...");
    try {
      swapTx = await createSwapTx(
        props,
        {
          platformFeeBps: props.platformFeeBps ?? 0,
          slippageBps: props.slippageBps ?? 0,
        },
        props.marginfiClient.provider.publicKey,
        props.marginfiClient.provider.connection
      );
    } catch (error) {
      console.error("Error creating swap transaction:", error);
    }

    if (!swapTx) {
      // TODO: handle error
    }
  }

  // Marginfi Account
  const hasMarginfiAccount = !!props.marginfiAccount;
  let accountCreationTx: SolanaTransaction[] = [];
  let finalAccount: MarginfiAccountWrapper | null = props.marginfiAccount;
  if (!hasMarginfiAccount) {
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

    finalAccount = wrappedAccount;

    accountCreationTx.push(
      await props.marginfiClient.createMarginfiAccountTx({ accountKeypair: marginfiAccountKeypair })
    );
  }

  const result = await calculateLoopingParams({
    ...props,
    setupBankAddresses: [props.borrowBank.info.state.mint],
    marginfiAccount: finalAccount,
    depositAmount: swapTx?.quote?.outAmount
      ? Number(nativeToUi(swapTx?.quote?.outAmount, props.depositBank.info.state.mintDecimals))
      : props.depositAmount,
  });

  if (result && "actionQuote" in result) {
    return {
      ...result,
      additionalTxns: [...(swapTx ? [swapTx.tx] : []), ...accountCreationTx, ...(result.additionalTxns ?? [])],
      marginfiAccount: finalAccount ?? undefined,
    };
  }

  console.log("result", result);

  return result;
}

export async function createSwapTx(
  props: CalculateLoopingProps,
  jupOpts: { platformFeeBps: number; slippageBps: number },
  feepayer: PublicKey,
  connection: Connection
) {
  const jupiterQuoteApi = createJupiterApiClient();

  const swapQuote = await getSwapQuoteWithRetry({
    swapMode: "ExactIn",
    amount: uiToNative(props.depositAmount, 6).toNumber(),
    inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    outputMint: props.depositBank.info.state.mint.toBase58(), // Token
    platformFeeBps: jupOpts.platformFeeBps,
    slippageBps: jupOpts.slippageBps,
  });

  if (!swapQuote) {
    return;
    // TODO: handle error
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
      userPublicKey: feepayer.toBase58(),
      feeAccount: undefined,
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
    },
  });

  const swapIx = deserializeInstruction(swapInstruction);
  const setupInstructionsIxs = setupInstructions.map((value) => deserializeInstruction(value));
  const cuInstructionsIxs = computeBudgetInstructions.map((value) => deserializeInstruction(value));
  const addressLookupAccounts = await getAdressLookupTableAccounts(connection, addressLookupTableAddresses);
  const finalBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const swapMessage = new TransactionMessage({
    payerKey: feepayer,
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
}
