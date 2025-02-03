import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { v4 as uuidv4 } from "uuid";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  addTransactionMetadata,
  LUT_PROGRAM_AUTHORITY_INDEX,
  SolanaTransaction,
  uiToNative,
} from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  calculateMaxRepayableCollateralLegacy,
  ClosePositionActionTxns,
  deserializeInstruction,
  executeClosePositionAction,
  ExecuteClosePositionActionProps,
  extractErrorString,
  getAdressLookupTableAccounts,
  getSwapQuoteWithRetry,
  IndividualFlowError,
  STATIC_SIMULATION_ERRORS,
} from "@mrgnlabs/mrgn-utils";
import { calculateClosePositions } from "~/utils";
import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { ArenaPoolV2Extended, GroupStatus } from "~/types/trade-store.types";
import { JupiterOptions } from "~/components";

/**
 * Simulates closing a position by fetching and validating the required transactions
 */
export const simulateClosePosition = async ({
  marginfiAccount,
  depositBanks,
  borrowBank,
  jupiterOptions,
  connection,
  platformFeeBps,
  setIsLoading,
  tradeState,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBanks: ActiveBankInfo[];
  borrowBank: ActiveBankInfo | null;
  jupiterOptions: JupiterOptions | null;
  connection: Connection;
  platformFeeBps: number;
  setIsLoading: (loading: boolean) => void;
  tradeState: GroupStatus;
}): Promise<{ actionTxns: ClosePositionActionTxns | null; actionMessage: ActionMessageType | null }> => {
  try {
    if (!marginfiAccount) {
      return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED };
    }
    if (depositBanks.length === 0 || !borrowBank) {
      return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.BANK_NOT_INITIALIZED };
    }
    if (!jupiterOptions) {
      return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.JUPITER_OPTIONS_NOT_INITIALIZED };
    }

    setIsLoading(true);

    const { actionTxns, actionMessage } = await fetchClosePositionTxns({
      marginfiAccount,
      depositBank: depositBanks[0],
      borrowBank: borrowBank,
      jupiterOptions,
      connection: connection,
      platformFeeBps,
      tradeState,
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
  jupiterOptions: JupiterOptions;
  connection: Connection;
  platformFeeBps: number;
  tradeState: GroupStatus;
}): Promise<{ actionTxns: ClosePositionActionTxns | null; actionMessage: ActionMessageType | null }> => {
  try {
    let txns: ClosePositionActionTxns | ActionMessageType;

    txns = await calculateClosePositions({
      marginfiAccount: props.marginfiAccount,
      depositBanks: [props.depositBank],
      borrowBank: props.borrowBank,
      jupiterOptions: props.jupiterOptions,
      connection: props.connection,
      platformFeeBps: props.platformFeeBps,
    });

    // if the actionTxn is not present, we need to return an error
    if (!("actionTxn" in txns)) {
      return { actionTxns: null, actionMessage: txns };
    }

    // if the trade state is long, we need to swap to the Quote token again
    if (props.tradeState === GroupStatus.LONG) {
      const swapTx = await getSwapTx({
        ...props,
        authority: props.marginfiAccount.authority,
        jupiterOptions: props.jupiterOptions,
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

interface ExecuteClosePositionActionsProps extends ExecuteActionsCallbackProps {
  params: ExecuteClosePositionActionProps;
  arenaPool: ArenaPoolV2Extended;
}

export const handleExecuteClosePositionAction = async ({
  params,
  arenaPool,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: ExecuteClosePositionActionsProps) => {
  try {
    setIsLoading(true);
    const attemptUuid = uuidv4();
    captureEvent(`user_close_position_initiate`, {
      uuid: attemptUuid,
      token: arenaPool.tokenBank.meta.tokenSymbol,
      tokenSize: arenaPool.tokenBank.isActive ? arenaPool.tokenBank.position.amount : 0,
      quoteSize: arenaPool.quoteBank.isActive ? arenaPool.quoteBank.position.amount : 0,
    });

    const txnSig = await executeClosePositionAction(params);

    setIsLoading(false);

    if (txnSig) {
      setIsComplete(txnSig ?? "");
      captureEvent(`user_close_position`, {
        uuid: attemptUuid,
        txn: txnSig!,
        token: arenaPool.tokenBank.meta.tokenSymbol,
        tokenSize: arenaPool.tokenBank.isActive ? arenaPool.tokenBank.position.amount : 0,
        quoteSize: arenaPool.quoteBank.isActive ? arenaPool.quoteBank.position.amount : 0,
      });
    }
  } catch (error) {
    setError(error as IndividualFlowError);
  }
};

/**
 * Creates a transaction to close a marginfi account
 */
async function getCloseAccountTx(marginfiAccount: MarginfiAccountWrapper): Promise<SolanaTransaction> {
  return marginfiAccount.makeCloseAccountTx();
}

/**
 * Quote token Swap Transaction Logic
 *
 * Contains functions for creating and executing swaps to the Quote token:
 * - getSwapTx: Gets transaction for swapping max repayable collateral
 * - createSwapTx: Creates Jupiter swap transaction with given parameters
 */

/**
 * Common types/interfaces for swap transactions
 */
type SwapTxProps = {
  depositBank: ActiveBankInfo;
  borrowBank: ActiveBankInfo;
  authority: PublicKey;
  connection: Connection;
  jupiterOptions: JupiterOptions;
  platformFeeBps: number;
};
interface CreateSwapTxProps extends SwapTxProps {
  swapAmount: number;
}

interface GetSwapTxProps extends SwapTxProps {
  depositBank: ActiveBankInfo;
}

type CreateSwapTxResponse = { tx: SolanaTransaction; quote: QuoteResponse };

/**
 * Gets a Jupiter swap transaction for swapping the maximum repayable collateral amount to the Quote token
 */
async function getSwapTx({ ...props }: SwapTxProps): Promise<CreateSwapTxResponse | ActionMessageType> {
  const maxAmount = await calculateMaxRepayableCollateralLegacy(
    props.borrowBank,
    props.depositBank,
    props.jupiterOptions?.slippageBps,
    props.jupiterOptions?.slippageMode
  ); // TODO: confirm this is still working
  if (!maxAmount) {
    return STATIC_SIMULATION_ERRORS.MAX_AMOUNT_CALCULATION_FAILED;
  }
  const amount = props.depositBank.position.amount - maxAmount;

  const swapTx = await createSwapTx({ ...props, swapAmount: amount });

  return swapTx;
}

async function createSwapTx({
  depositBank,
  borrowBank,
  swapAmount,
  authority,
  connection,
  jupiterOptions,
  platformFeeBps,
}: CreateSwapTxProps): Promise<CreateSwapTxResponse> {
  const jupiterQuoteApi = createJupiterApiClient();

  const swapQuote = await getSwapQuoteWithRetry({
    swapMode: "ExactIn",
    amount: uiToNative(swapAmount, depositBank.info?.rawBank.mintDecimals).toNumber(),
    outputMint: borrowBank.info.state.mint.toBase58(),
    inputMint: depositBank.info.state.mint.toBase58(),
    slippageBps: jupiterOptions?.slippageMode === "FIXED" ? jupiterOptions?.slippageBps : undefined,
    platformFeeBps: platformFeeBps,
    dynamicSlippage: jupiterOptions?.slippageMode === "DYNAMIC" ? true : false,
  });

  if (!swapQuote) {
    throw new Error("Swap quote fetching for Quote token swap failed.");
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
