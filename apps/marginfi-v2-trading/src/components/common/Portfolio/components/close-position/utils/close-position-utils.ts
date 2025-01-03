import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

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
  composeExplorerUrl,
  deserializeInstruction,
  DYNAMIC_SIMULATION_ERRORS,
  extractErrorString,
  getAdressLookupTableAccounts,
  getSwapQuoteWithRetry,
  MultiStepToastHandle,
  STATIC_SIMULATION_ERRORS,
} from "@mrgnlabs/mrgn-utils";
import { calculateClosePositions } from "~/utils";

/**
 * Simulates closing a position by fetching and validating the required transactions
 */
export const simulateClosePosition = async ({
  marginfiAccount,
  depositBanks,
  borrowBank,
  slippageBps,
  connection,
  platformFeeBps,
  setIsLoading,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBanks: ActiveBankInfo[];
  borrowBank: ActiveBankInfo | null;
  slippageBps: number;
  connection: Connection;
  platformFeeBps: number;
  setIsLoading: (loading: boolean) => void;
}): Promise<{ actionTxns: ClosePositionActionTxns | null; actionMessage: ActionMessageType | null }> => {
  try {
    if (!marginfiAccount) {
      return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED };
    }
    if (depositBanks.length === 0 || !borrowBank) {
      return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.BANK_NOT_INITIALIZED };
    }

    setIsLoading(true);

    const { actionTxns, actionMessage } = await fetchClosePositionTxns({
      marginfiAccount,
      depositBank: depositBanks[0],
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
    const msg = extractErrorString(error);
    let actionMethod: ActionMessageType = STATIC_SIMULATION_ERRORS.TRADE_FAILED;
    if (msg) {
      actionMethod = {
        isEnabled: false,
        actionMethod: "WARNING",
        description: msg,
        code: 101,
      };
    }
    console.error("Error simulating transaction", error);

    return { actionTxns: null, actionMessage: actionMethod };
  } finally {
    setIsLoading(false);
  }
};

const fetchClosePositionTxns = async (props: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBank: ActiveBankInfo;
  borrowBank: ActiveBankInfo;
  slippageBps: number;
  connection: Connection;
  platformFeeBps: number;
}): Promise<{ actionTxns: ClosePositionActionTxns | null; actionMessage: ActionMessageType | null }> => {
  try {
    let txns: ClosePositionActionTxns | ActionMessageType;

    txns = await calculateClosePositions({
      marginfiAccount: props.marginfiAccount,
      depositBanks: [props.depositBank],
      borrowBank: props.borrowBank,
      slippageBps: props.slippageBps,
      connection: props.connection,
      platformFeeBps: props.platformFeeBps,
    });

    // if the actionTxn is not present, we need to return an error
    if (!("actionTxn" in txns)) {
      return { actionTxns: null, actionMessage: txns };
    }

    // if the deposit bank is not USDC, we need to swap to USDC
    if (props.depositBank.meta.tokenSymbol !== "USDC") {
      const swapTx = await getSwapTx({
        ...props,
        authority: props.marginfiAccount.authority,
        jupOpts: {
          slippageBps: props.slippageBps,
          platformFeeBps: props.platformFeeBps,
        },
      });

      if ("tx" in swapTx) {
        txns = {
          ...txns,
          closeTransactions: swapTx.tx ? [swapTx.tx] : [],
        };
      } else {
        return { actionTxns: null, actionMessage: swapTx };
      }
    }

    // close marginfi account
    const closeAccountTx = await getCloseAccountTx(props.marginfiAccount);

    txns = {
      ...txns,
      closeTransactions: [...(txns.closeTransactions ?? []), closeAccountTx],
    };

    return { actionTxns: txns, actionMessage: null };
  } catch (error) {
    const msg = extractErrorString(error);
    let actionMethod: ActionMessageType = STATIC_SIMULATION_ERRORS.TRADE_FAILED;
    if (msg) {
      actionMethod = {
        isEnabled: false,
        actionMethod: "WARNING",
        description: msg,
        code: 101,
      };
    }
    console.error("Error simulating transaction", error);

    return { actionTxns: null, actionMessage: actionMethod };
  }
};

export const closePosition = async ({
  marginfiClient,
  actionTransaction,
  broadcastType,
  priorityFees,
  multiStepToast,
}: {
  marginfiClient: MarginfiClient;
  actionTransaction: ClosePositionActionTxns;
  broadcastType: TransactionBroadcastType;
  priorityFees: PriorityFees;
  multiStepToast: MultiStepToastHandle;
}): Promise<{ txnSig: string | null; actionMessage: ActionMessageType | null }> => {
  if (!actionTransaction.actionTxn) {
    return { txnSig: null, actionMessage: STATIC_SIMULATION_ERRORS.TRADE_FAILED };
  }

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
        callback(index, success, sig, stepsToAdvance) {
          const currentLabel = multiStepToast?.getCurrentLabel();
          if (success && currentLabel === "Signing transaction") {
            multiStepToast.setSuccessAndNext(1, sig, composeExplorerUrl(sig));
          }
        },
      }
    );

    if (txnSig) {
      return { txnSig: Array.isArray(txnSig) ? txnSig[txnSig.length - 1] : txnSig, actionMessage: null };
    } else {
      return { txnSig: null, actionMessage: STATIC_SIMULATION_ERRORS.TRADE_FAILED };
    }
  } catch (error) {
    const msg = extractErrorString(error);
    let actionMethod: ActionMessageType = STATIC_SIMULATION_ERRORS.TRADE_FAILED;
    if (msg) {
      actionMethod = {
        isEnabled: false,
        actionMethod: "WARNING",
        description: msg,
        code: 101,
      };
    }
    console.error("Error simulating transaction", error);

    return { txnSig: null, actionMessage: actionMethod };
  }
};

/**
 * Creates a transaction to close a marginfi account
 */
async function getCloseAccountTx(marginfiAccount: MarginfiAccountWrapper): Promise<SolanaTransaction> {
  return marginfiAccount.makeCloseAccountTx();
}

/**
 * USDC Swap Transaction Logic
 *
 * Contains functions for creating and executing swaps to USDC:
 * - getSwapTx: Gets transaction for swapping max repayable collateral
 * - createSwapTx: Creates Jupiter swap transaction with given parameters
 */

/**
 * Common types/interfaces for swap transactions
 */
type SwapTxProps = {
  depositBank: ActiveBankInfo;
  authority: PublicKey;
  connection: Connection;
  jupOpts: { slippageBps: number; platformFeeBps?: number };
};
interface CreateSwapTxProps extends SwapTxProps {
  swapAmount: number;
}

interface GetSwapTxProps extends SwapTxProps {
  borrowBank: ActiveBankInfo;
}

type CreateSwapTxResponse = { tx: SolanaTransaction; quote: QuoteResponse };

/**
 * Gets a Jupiter swap transaction for swapping the maximum repayable collateral amount to USDC
 */
async function getSwapTx({ borrowBank, ...props }: GetSwapTxProps): Promise<CreateSwapTxResponse | ActionMessageType> {
  const maxAmount = await calculateMaxRepayableCollateral(borrowBank, props.depositBank, props.jupOpts.slippageBps);
  if (!maxAmount) {
    return STATIC_SIMULATION_ERRORS.MAX_AMOUNT_CALCULATION_FAILED;
  }
  const amount = props.depositBank.position.amount - maxAmount;

  const swapTx = await createSwapTx({ ...props, swapAmount: amount });

  return swapTx;
}

async function createSwapTx({
  depositBank,
  swapAmount,
  authority,
  connection,
  jupOpts,
}: CreateSwapTxProps): Promise<CreateSwapTxResponse> {
  const jupiterQuoteApi = createJupiterApiClient();

  const swapQuote = await getSwapQuoteWithRetry({
    swapMode: "ExactIn",
    amount: uiToNative(swapAmount, depositBank.info?.rawBank.mintDecimals).toNumber(),
    outputMint: USDC_MINT.toBase58(),
    inputMint: depositBank.info.state.mint.toBase58(),
    slippageBps: jupOpts.slippageBps,
    platformFeeBps: jupOpts.platformFeeBps,
  });

  if (!swapQuote) {
    throw new Error("Swap quote fetching for USDC swap failed.");
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
}
