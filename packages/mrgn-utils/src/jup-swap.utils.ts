import { QuoteResponse, createJupiterApiClient } from "@jup-ag/api";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  SolanaTransaction,
  uiToNative,
  LUT_PROGRAM_AUTHORITY_INDEX,
  addTransactionMetadata,
  TransactionType,
} from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getSwapQuoteWithRetry, deserializeInstruction, getAdressLookupTableAccounts } from "./actions";

/**
 * Quote token Swap Transaction Logic
 *
 * Contains functions for creating and executing swaps to the Quote token:
 * - getSwapTx: Gets transaction for swapping
 * - createSwapTx: Creates Jupiter swap transaction with given parameters
 */

/**
 * Common types/interfaces for swap transactions
 */

export type SlippageModes = "DYNAMIC" | "FIXED";

export type JupiterOptions = {
  slippageMode: SlippageModes;
  slippageBps: number;
  directRoutesOnly: boolean;
};

type CreateSwapTxProps = {
  inputBank: ExtendedBankInfo;
  outputBank: ExtendedBankInfo;
  swapAmount: number;
  authority: PublicKey;
  connection: Connection;
  jupiterOptions: JupiterOptions;
  platformFeeBps: number;
};

type CreateSwapTxResponse = { tx: SolanaTransaction; quote: QuoteResponse };

/**
 * Gets a Jupiter swap transaction for swapping the maximum repayable collateral amount to the Quote token
 */
export async function createSwapTx({
  inputBank,
  outputBank,
  swapAmount,
  authority,
  connection,
  jupiterOptions,
  platformFeeBps,
}: CreateSwapTxProps): Promise<CreateSwapTxResponse> {
  const jupiterQuoteApi = createJupiterApiClient();

  const swapQuote = await getSwapQuoteWithRetry({
    swapMode: "ExactIn",
    amount: uiToNative(swapAmount, inputBank.info?.rawBank.mintDecimals).toNumber(),
    outputMint: outputBank.info.state.mint.toBase58(),
    inputMint: inputBank.info.state.mint.toBase58(),
    slippageBps: jupiterOptions?.slippageMode === "FIXED" ? jupiterOptions?.slippageBps : undefined,
    platformFeeBps: platformFeeBps,
    dynamicSlippage: jupiterOptions?.slippageMode === "DYNAMIC" ? true : false,
  });

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
