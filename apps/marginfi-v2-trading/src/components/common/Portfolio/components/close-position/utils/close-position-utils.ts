import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  addTransactionMetadata,
  LUT_PROGRAM_AUTHORITY_INDEX,
  SolanaTransaction,
  TransactionType,
  uiToNative,
} from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  ActionProcessingError,
  calculateMaxRepayableCollateral,
  ClosePositionActionTxns,
  deserializeInstruction,
  extractErrorString,
  getAdressLookupTableAccounts,
  getSwapQuoteWithRetry,
  STATIC_SIMULATION_ERRORS,
} from "@mrgnlabs/mrgn-utils";
import { calculateClosePositions } from "~/utils";
import { GroupStatus } from "~/types/trade-store.types";
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
  tradeState,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBanks: ActiveBankInfo[];
  borrowBank: ActiveBankInfo | null;
  jupiterOptions: JupiterOptions | null;
  connection: Connection;
  platformFeeBps: number;
  tradeState: GroupStatus;
}): Promise<{ actionTxns: ClosePositionActionTxns }> => {
  if (!marginfiAccount) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED);
  }
  if (depositBanks.length === 0 || !borrowBank) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.BANK_NOT_INITIALIZED);
  }
  if (!jupiterOptions) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.JUPITER_OPTIONS_NOT_INITIALIZED);
  }

  const { actionTxns } = await fetchClosePositionTxns({
    marginfiAccount,
    depositBank: depositBanks[0],
    borrowBank: borrowBank,
    jupiterOptions,
    connection: connection,
    platformFeeBps,
    tradeState,
  });

  return { actionTxns };
};

const fetchClosePositionTxns = async (props: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBank: ActiveBankInfo;
  borrowBank: ActiveBankInfo;
  jupiterOptions: JupiterOptions;
  connection: Connection;
  platformFeeBps: number;
  tradeState: GroupStatus;
}): Promise<{ actionTxns: ClosePositionActionTxns }> => {
  let txns: ClosePositionActionTxns;

  txns = await calculateClosePositions({
    marginfiAccount: props.marginfiAccount,
    depositBanks: [props.depositBank],
    borrowBank: props.borrowBank,
    jupiterOptions: props.jupiterOptions,
    connection: props.connection,
    platformFeeBps: props.platformFeeBps,
  });

  // if the trade state is long, we need to swap to the Quote token again
  if (props.tradeState === GroupStatus.LONG) {
    const swapTx = await getSwapTx({
      ...props,
      authority: props.marginfiAccount.authority,
      jupiterOptions: props.jupiterOptions,
      maxAmount: txns.maxAmount,
    });
    txns = {
      ...txns,
      closeTransactions: swapTx.tx ? [swapTx.tx] : [],
    };
  }

  // close marginfi account
  const closeAccountTx = await getCloseAccountTx(props.marginfiAccount);

  txns = {
    ...txns,
    closeTransactions: [...(txns.closeTransactions ?? []), closeAccountTx],
  };

  return { actionTxns: txns };
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
  maxAmount: number;
};
interface CreateSwapTxProps extends SwapTxProps {
  swapAmount: number;
}

type CreateSwapTxResponse = { tx: SolanaTransaction; quote: QuoteResponse };

/**
 * Gets a Jupiter swap transaction for swapping the maximum repayable collateral amount to the Quote token
 */
async function getSwapTx({ ...props }: SwapTxProps): Promise<CreateSwapTxResponse> {
  const amount = props.depositBank.position.amount - props.maxAmount;
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
      type: TransactionType.JUPITER_SWAP,
    }
  );

  return { quote: swapQuote, tx: swapTx };
}
