import { BN } from "@coral-xyz/anchor";
import BigNumber from "bignumber.js";
import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import {
  BalanceRaw,
  MarginfiAccount,
  MarginfiAccountRaw,
  MarginfiAccountWrapper,
  MarginfiClient,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  addTransactionMetadata,
  bigNumberToWrappedI80F48,
  LUT_PROGRAM_AUTHORITY_INDEX,
  nativeToUi,
  SolanaTransaction,
  TransactionType,
  uiToNative,
  WalletToken,
} from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  ActionTxns,
  deserializeInstruction,
  getAdressLookupTableAccounts,
  getSwapQuoteWithRetry,
  handleSimulationError,
  IndividualFlowError,
  MarginfiActionParams,
  STATIC_SIMULATION_ERRORS,
  DepositSwapActionTxns,
} from "@mrgnlabs/mrgn-utils";

import { Keypair, PublicKey, Transaction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { ActionSummary, SimulatedActionPreview } from "../../lend-box/utils";
import {
  ActionPreview,
  simulatedCollateral,
  simulatedHealthFactor,
  simulatedPositionSize,
} from "~/components/action-box-v2/utils";
import { JupiterOptions } from "~/components/settings";


export interface GenerateDepositSwapTxnsProps {
  marginfiAccount: MarginfiAccountWrapper;
  depositBank: ExtendedBankInfo;
  swapBank?: ExtendedBankInfo | WalletToken | null;
  amount: number;
  marginfiClient: MarginfiClient;
  jupiterOptions: JupiterOptions | null;
}

export async function generateDepositSwapTxns(
  props: GenerateDepositSwapTxnsProps
): Promise<DepositSwapActionTxns | ActionMessageType> {
  let swapTx: { quote?: QuoteResponse; tx?: SolanaTransaction; error?: ActionMessageType } | undefined;

  if (
    props.swapBank &&
    ("info" in props.swapBank ? props.swapBank.info.state.mint.toBase58() : props.swapBank.address.toBase58()) !==
      props.depositBank.info.state.mint.toBase58()
  ) {
    try {
      swapTx = await createSwapTx(props);
      if (swapTx.error) {
        console.error("Error creating swap transaction:", swapTx.error);
        return swapTx.error;
      } else {
        if (!swapTx.tx || !swapTx.quote) {
          return STATIC_SIMULATION_ERRORS.CREATE_SWAP_FAILED;
        }
      }
    } catch (error) {
      console.error("Error creating swap transaction:", error);
      return STATIC_SIMULATION_ERRORS.CREATE_SWAP_FAILED;
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

  let finalDepositAmount = props.amount;

  if (
    props.swapBank &&
    ("info" in props.swapBank ? props.swapBank.info.state.mint.toBase58() : props.swapBank.address.toBase58()) !==
      props.depositBank.info.state.mint.toBase58() &&
    !swapTx?.quote
  ) {
    return STATIC_SIMULATION_ERRORS.CREATE_SWAP_FAILED;
  } else if (props.swapBank && swapTx?.quote) {
    finalDepositAmount = Number(
      nativeToUi(
        swapTx?.quote?.otherAmountThreshold ?? swapTx?.quote?.outAmount,
        props.depositBank.info.state.mintDecimals
      )
    );
  }

  const depositTx = await props.marginfiAccount.makeDepositTx(finalDepositAmount, props.depositBank.address);

  return {
    transactions: [...(swapTx?.tx ? [swapTx.tx] : []), depositTx],
    actionQuote: swapTx?.quote ?? null,
  };
}

export async function createSwapTx(props: GenerateDepositSwapTxnsProps) {
  if (!props.swapBank) {
    console.error("Swap bank is required");
    throw new Error("Swap bank is required");
  }

  try {
    const jupiterQuoteApi = createJupiterApiClient();
    const mintDecimals =
      "info" in props.swapBank ? props.swapBank.info.state.mintDecimals : props.swapBank.mintDecimals;
    const inputMint =
      "info" in props.swapBank ? props.swapBank.info.state.mint.toBase58() : props.swapBank.address.toBase58();

    const swapQuote = await getSwapQuoteWithRetry({
      swapMode: "ExactIn",
      amount: uiToNative(props.amount, mintDecimals).toNumber(),
      inputMint: inputMint,
      outputMint: props.depositBank.info.state.mint.toBase58(),
      slippageBps: props.jupiterOptions?.slippageMode === "FIXED" ? props.jupiterOptions?.slippageBps : undefined,
      dynamicSlippage: props.jupiterOptions?.slippageMode === "DYNAMIC" ? true : false,
    });

    if (!swapQuote) {
      return { error: STATIC_SIMULATION_ERRORS.CREATE_SWAP_FAILED };
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
        userPublicKey: props.marginfiAccount.authority.toBase58(),
        programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
      },
    });

    const swapIx = deserializeInstruction(swapInstruction);
    const setupInstructionsIxs = setupInstructions.map((value) => deserializeInstruction(value));
    const cuInstructionsIxs = computeBudgetInstructions.map((value) => deserializeInstruction(value));
    // const cleanupInstructionIx = deserializeInstruction(cleanupInstruction);
    const addressLookupAccounts = await getAdressLookupTableAccounts(
      props.marginfiClient.provider.connection,
      addressLookupTableAddresses
    );
    const finalBlockhash = (await props.marginfiClient.provider.connection.getLatestBlockhash()).blockhash;

    const swapMessage = new TransactionMessage({
      payerKey: props.marginfiAccount.authority,
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
  } catch (error) {
    console.error("Error creating swap transaction:", error);
    return { error: STATIC_SIMULATION_ERRORS.CREATE_SWAP_FAILED };
  }
}

async function createMarginfiAccountTx(
  props: GenerateDepositSwapTxnsProps
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

