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

export interface CalculatePreviewProps {
  actionMode: ActionType;
  simulationResult?: SimulationResult;
  bank: ExtendedBankInfo;
  accountSummary: AccountSummary;
  actionTxns: DepositSwapActionTxns;
}

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
    ("info" in props.swapBank ? props.swapBank.info.state.mint.toBase58() : props.swapBank.symbol)
  ) {
    console.log("Creating Quote swap transaction...");
    try {
      swapTx = await createSwapTx(props);
      console.log("swapTx", swapTx);
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
  console.log("finalDepositAmount", finalDepositAmount);

  if (props.swapBank && !swapTx?.quote) {
    return STATIC_SIMULATION_ERRORS.CREATE_SWAP_FAILED;
  } else if (props.swapBank && swapTx?.quote) {
    finalDepositAmount = Number(
      nativeToUi(
        swapTx?.quote?.otherAmountThreshold ?? swapTx?.quote?.outAmount,
        props.depositBank.info.state.mintDecimals
      )
    );
    console.log("finalDepositAmount 2", finalDepositAmount);
  }

  const depositTx = await props.marginfiAccount.makeDepositTx(finalDepositAmount, props.depositBank.address);

  return {
    actionTxn: depositTx,
    additionalTxns: [...(swapTx?.tx ? [swapTx.tx] : [])],
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
        type: "SWAP",
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

export interface SimulateActionProps {
  txns: (VersionedTransaction | Transaction)[];
  bank: ExtendedBankInfo;
  account: MarginfiAccountWrapper;
}

export const getSimulationResult = async (props: SimulateActionProps) => {
  let actionMethod: ActionMessageType | undefined = undefined;
  let simulationResult: SimulationResult | null = null;

  try {
    simulationResult = await simulateFlashLoan(props);
  } catch (error: any) {
    const actionString = "Looping";
    actionMethod = handleSimulationError(error, props.bank, true, actionString);
  }

  return { simulationResult, actionMethod };
};

async function simulateFlashLoan({ account, bank, txns }: SimulateActionProps) {
  let simulationResult: SimulationResult;

  if (txns.length > 0) {
    simulationResult = await account.simulateBorrowLendTransaction(txns, [bank.address]);
    return simulationResult;
  } else {
    console.error("Failed to simulate flashloan");
    throw new Error("Failed to simulate flashloan");
  }
}

export function calculateSummary({
  simulationResult,
  bank,
  actionMode,
  accountSummary,
  actionTxns,
}: CalculatePreviewProps): ActionSummary {
  let simulationPreview: SimulatedActionPreview | null = null;

  if (simulationResult) {
    simulationPreview = calculateSimulatedActionPreview(simulationResult, bank);
  }

  const actionPreview = calculateActionPreview(bank, actionMode, accountSummary, actionTxns);

  return {
    actionPreview,
    simulationPreview,
  } as ActionSummary;
}

function calculateActionPreview(
  bank: ExtendedBankInfo,
  actionMode: ActionType,
  accountSummary: AccountSummary,
  actionTxns: DepositSwapActionTxns
): ActionPreview {
  const isLending = [ActionType.Deposit, ActionType.Withdraw].includes(actionMode);
  const positionAmount = bank?.isActive ? bank.position.amount : 0;
  const health = accountSummary.balance && accountSummary.healthFactor ? accountSummary.healthFactor : 1;
  const liquidationPrice =
    bank.isActive && bank.position.liquidationPrice && bank.position.liquidationPrice > 0.01
      ? bank.position.liquidationPrice
      : null;

  const poolSize = isLending
    ? bank.info.state.totalDeposits
    : Math.max(
        0,
        Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit.toNumber()) -
          bank.info.state.totalBorrows
      );
  const bankCap = nativeToUi(
    isLending ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit,
    bank.info.state.mintDecimals
  );

  const slippageBps = actionTxns.actionQuote?.slippageBps;
  const priceImpactPct = actionTxns.actionQuote?.priceImpactPct;

  return {
    positionAmount,
    health,
    liquidationPrice,
    poolSize,
    bankCap,
    slippageBps,
    priceImpactPct,
  } as ActionPreview;
}

function calculateSimulatedActionPreview(
  simulationResult: SimulationResult,
  bank: ExtendedBankInfo
): SimulatedActionPreview {
  const health = simulatedHealthFactor(simulationResult);
  const positionAmount = simulatedPositionSize(simulationResult, bank);
  const availableCollateral = simulatedCollateral(simulationResult);

  const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBank(bank.address);
  const { lendingRate, borrowingRate } = simulationResult.banks.get(bank.address.toBase58())!.computeInterestRates();

  return {
    health,
    liquidationPrice,
    depositRate: lendingRate.toNumber(),
    borrowRate: borrowingRate.toNumber(),
    positionAmount,
    availableCollateral,
  };
}
