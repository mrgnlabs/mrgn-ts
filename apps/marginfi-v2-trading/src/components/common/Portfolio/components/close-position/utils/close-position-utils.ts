import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import { MarginfiAccountWrapper, MarginfiClient, PriorityFees } from "@mrgnlabs/marginfi-client-v2";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  addTransactionMetadata,
  LUT_PROGRAM_AUTHORITY_INDEX,
  SolanaTransaction,
  TransactionBroadcastType,
  uiToNative,
  USDC_MINT,
} from "@mrgnlabs/mrgn-common";

import {
  ActionMessageType,
  calculateMaxRepayableCollateral,
  ClosePositionActionTxns,
  deserializeInstruction,
  DYNAMIC_SIMULATION_ERRORS,
  getAdressLookupTableAccounts,
  getSwapQuoteWithRetry,
  MultiStepToastHandle,
  STATIC_SIMULATION_ERRORS,
} from "@mrgnlabs/mrgn-utils";
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { calculateClosePositions } from "~/utils";

export const fetchTransactionsAction = async ({
  marginfiAccount,
  depositBanks,
  borrowBank,
  slippageBps,
  connection,
  platformFeeBps,
  setIsLoading,
  setMultiStepToast,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBanks: ActiveBankInfo[];
  borrowBank: ActiveBankInfo | null;
  slippageBps: number;
  connection: Connection;
  platformFeeBps: number;
  setIsLoading: (loading: boolean) => void;
  setMultiStepToast: (toast: MultiStepToastHandle) => void;
}): Promise<{ actionTxns: ClosePositionActionTxns | null; actionMessage: ActionMessageType | null }> => {
  try {
    if (!marginfiAccount || !depositBanks[0] || !borrowBank) {
      throw new Error("Invalid input"); // TODO: handle
    }

    setIsLoading(true);

    const { actionTxns, actionMessage } = await fetchClosePositionTxns({
      marginfiAccount,
      depositBanks: depositBanks,
      borrowBank: borrowBank,
      slippageBps,
      connection: connection,
      platformFeeBps,
    });

    if (actionMessage || actionTxns === null) {
      return { actionTxns: null, actionMessage: actionMessage ?? STATIC_SIMULATION_ERRORS.TRADE_FAILED };
    }

    return { actionTxns, actionMessage };
  } catch (error) {
    console.error("Error simulating transaction", error);
    return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.TRADE_FAILED };
  } finally {
    setIsLoading(false);
  }
};

const fetchClosePositionTxns = async (props: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBanks: ActiveBankInfo[];
  borrowBank: ActiveBankInfo;
  slippageBps: number;
  connection: Connection;
  platformFeeBps: number;
}): Promise<{ actionTxns: ClosePositionActionTxns | null; actionMessage: ActionMessageType | null }> => {
  try {
    let txns: ClosePositionActionTxns | ActionMessageType;
    txns = await calculateClosePositions({
      marginfiAccount: props.marginfiAccount,
      depositBanks: props.depositBanks,
      borrowBank: props.borrowBank,
      slippageBps: props.slippageBps,
      connection: props.connection,
      platformFeeBps: props.platformFeeBps,
    });

    let swapTx: { quote?: QuoteResponse; tx?: SolanaTransaction; error?: ActionMessageType } | undefined;
    if (props.depositBanks[0].meta.tokenSymbol !== "USDC") {
      console.log("Creating swap transaction...");
      const maxAmount = await calculateMaxRepayableCollateral(
        props.borrowBank,
        props.depositBanks[0],
        props.slippageBps
      );
      if (!maxAmount) {
        return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.FL_FAILED };
      }
      try {
        swapTx = await createSwapTx(
          props.depositBanks[0],
          maxAmount,
          {
            slippageBps: props.slippageBps, // TODO: do we want to take platform fee here?
          },
          props.marginfiAccount.authority, // Is this correct
          props.connection
        );

        console.log("swapTx", swapTx);
        if (swapTx.error) {
          console.error("USDC swap transaction error:", swapTx.error);
          return { actionTxns: null, actionMessage: swapTx.error };
        } else {
          if (!swapTx.tx || !swapTx.quote) {
            return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.FL_FAILED };
          }
        }
      } catch (error) {
        console.error("Error creating USDC swap transaction:", error);
        return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.FL_FAILED };
      }
    }

    if ("actionTxn" in txns) {
      if (swapTx?.tx && swapTx?.quote) {
        console.log({
          actionTxns: {
            ...txns,
            closeTransactions: swapTx.tx ? [swapTx.tx] : [],
          },
          actionMessage: null,
        });
        return {
          actionTxns: {
            ...txns,
            closeTransactions: swapTx.tx ? [swapTx.tx] : [],
          },
          actionMessage: null,
        };
      } else {
        return {
          actionTxns: txns,
          actionMessage: null,
        };
      }
    } else {
      const errorMessage = txns ?? DYNAMIC_SIMULATION_ERRORS.TRADE_FAILED_CHECK();
      return { actionTxns: null, actionMessage: errorMessage };
    }
  } catch (error) {
    return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.TRADE_FAILED };
  }
};

async function createSwapTx(
  depositBank: ActiveBankInfo,
  depositAmount: number,
  jupOpts: { slippageBps: number },
  authority: PublicKey,
  connection: Connection
): Promise<{ quote?: QuoteResponse; tx?: SolanaTransaction; error?: ActionMessageType }> {
  try {
    const jupiterQuoteApi = createJupiterApiClient();

    const swapQuote = await getSwapQuoteWithRetry({
      swapMode: "ExactIn",
      amount: uiToNative(depositAmount, depositBank.info?.rawBank.mintDecimals).toNumber(),
      outputMint: USDC_MINT.toBase58(),
      inputMint: depositBank.info.state.mint.toBase58(),
      slippageBps: jupOpts.slippageBps,
    });

    console.log("swapQuote", swapQuote);

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

export const closePositionAction = async ({
  marginfiClient,
  actionTransaction,
  broadcastType,
  priorityFees,
}: {
  marginfiClient: MarginfiClient;
  actionTransaction: ClosePositionActionTxns;
  broadcastType: TransactionBroadcastType;
  priorityFees: PriorityFees;
}): Promise<{ txnSig: string | null; actionMessage: ActionMessageType | null }> => {
  if (!actionTransaction.actionTxn) {
    return { txnSig: null, actionMessage: STATIC_SIMULATION_ERRORS.TRADE_FAILED };
  }

  console.log("actionTransaction", [
    ...actionTransaction.additionalTxns,
    actionTransaction.actionTxn,
    ...(actionTransaction.closeTransactions ? actionTransaction.closeTransactions : []),
  ]);

  try {
    const txnSig = await marginfiClient.processTransactions(
      [
        ...actionTransaction.additionalTxns,
        actionTransaction.actionTxn,
        ...(actionTransaction.closeTransactions ? actionTransaction.closeTransactions : []),
      ],
      {
        broadcastType: broadcastType,
        ...priorityFees,
      }
    );

    if (txnSig) {
      return { txnSig: Array.isArray(txnSig) ? txnSig[txnSig.length - 1] : txnSig, actionMessage: null };
    } else {
      return { txnSig: null, actionMessage: STATIC_SIMULATION_ERRORS.TRADE_FAILED };
    }
  } catch (error) {
    return { txnSig: null, actionMessage: STATIC_SIMULATION_ERRORS.TRADE_FAILED };
  }
};
