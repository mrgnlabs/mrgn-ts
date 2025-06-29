import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";

import { createMarginfiAccountTx, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import {
  addTransactionMetadata,
  LUT_PROGRAM_AUTHORITY_INDEX,
  nativeToUi,
  SolanaTransaction,
  TransactionType,
  uiToNative,
  WalletToken,
} from "@mrgnlabs/mrgn-common";
import {
  deserializeInstruction,
  getAdressLookupTableAccounts,
  getSwapQuoteWithRetry,
  STATIC_SIMULATION_ERRORS,
  DepositSwapActionTxns,
  ActionProcessingError,
  JupiterOptions,
} from "@mrgnlabs/mrgn-utils";

export interface GenerateDepositSwapTxnsProps {
  marginfiAccount: MarginfiAccountWrapper | null;
  depositBank: ExtendedBankInfo;
  swapBank: ExtendedBankInfo | WalletToken | null;
  amount: number;
  marginfiClient: MarginfiClient;
  jupiterOptions: JupiterOptions | null;
}

function isExtendedBankInfo(bank: ExtendedBankInfo | WalletToken | null): bank is ExtendedBankInfo {
  return bank !== null && "info" in bank;
}

export async function generateDepositSwapTxns(
  props: GenerateDepositSwapTxnsProps
): Promise<{ actionTxns: DepositSwapActionTxns; account: MarginfiAccountWrapper }> {
  let transactions: SolanaTransaction[] = [];
  let swapQuote: QuoteResponse | undefined;

  const swapBankMint = isExtendedBankInfo(props.swapBank)
    ? props.swapBank.info.state.mint.toBase58()
    : props.swapBank?.address.toBase58();

  if (swapBankMint !== props.depositBank.info.state.mint.toBase58()) {
    const { tx, quote } = await createSwapTx(props);
    transactions.push(tx);
    swapQuote = quote;
  }

  // Marginfi Account
  let hasMarginfiAccount = !!props.marginfiAccount;
  const hasBalances = props.marginfiAccount?.activeBalances.length ?? 0 > 0;

  if (!hasBalances) {
    const accountInfo = await props.marginfiClient.provider.connection.getAccountInfo(
      props.marginfiAccount?.authority ?? props.marginfiClient.provider.publicKey
    );
    hasMarginfiAccount = accountInfo !== null;
  }

  let finalAccount: MarginfiAccountWrapper | null = props.marginfiAccount;
  if (!hasMarginfiAccount) {
    const { account, tx } = await createMarginfiAccountTx({
      marginfiAccount: props.marginfiAccount,
      marginfiClient: props.marginfiClient,
    });
    finalAccount = account;
    transactions.push(tx);
  }

  if (!finalAccount) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED);
  }

  let finalDepositAmount = props.amount;

  if (props.swapBank && swapQuote) {
    finalDepositAmount = Number(
      nativeToUi(swapQuote?.otherAmountThreshold ?? swapQuote?.outAmount, props.depositBank.info.state.mintDecimals)
    );
  }

  transactions.push(await finalAccount.makeDepositTx(finalDepositAmount, props.depositBank.address));

  return {
    actionTxns: {
      transactions,
      actionQuote: swapQuote ?? null,
    },
    account: finalAccount,
  };
}

export async function createSwapTx(props: GenerateDepositSwapTxnsProps) {
  if (!props.swapBank) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.BANK_NOT_PROVIDED_CHECK);
  }

  const jupiterQuoteApi = createJupiterApiClient();
  const mintDecimals = isExtendedBankInfo(props.swapBank)
    ? props.swapBank.info.state.mintDecimals
    : props.swapBank.mintDecimals;
  const inputMint = isExtendedBankInfo(props.swapBank)
    ? props.swapBank.info.state.mint.toBase58()
    : props.swapBank.address.toBase58();

  const swapQuote = await getSwapQuoteWithRetry({
    swapMode: "ExactIn",
    amount: uiToNative(props.amount, mintDecimals).toNumber(),
    inputMint: inputMint,
    outputMint: props.depositBank.info.state.mint.toBase58(),
    slippageBps: props.jupiterOptions?.slippageMode === "FIXED" ? props.jupiterOptions?.slippageBps : undefined,
    dynamicSlippage: props.jupiterOptions?.slippageMode === "DYNAMIC" ? true : false,
  });

  const { computeBudgetInstructions, swapInstruction, setupInstructions, addressLookupTableAddresses } =
    await jupiterQuoteApi.swapInstructionsPost({
      swapRequest: {
        quoteResponse: swapQuote,
        userPublicKey: (props.marginfiAccount?.authority ?? props.marginfiClient.provider.publicKey).toBase58(),
        programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
      },
    });

  const swapIx = deserializeInstruction(swapInstruction);
  const setupInstructionsIxs = setupInstructions.map((value) => deserializeInstruction(value));
  const cuInstructionsIxs = computeBudgetInstructions.map((value) => deserializeInstruction(value));
  const addressLookupAccounts = await getAdressLookupTableAccounts(
    props.marginfiClient.provider.connection,
    addressLookupTableAddresses
  );
  const finalBlockhash = (await props.marginfiClient.provider.connection.getLatestBlockhash()).blockhash;

  const swapMessage = new TransactionMessage({
    payerKey: props.marginfiAccount?.authority ?? props.marginfiClient.provider.publicKey,
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
