import { v4 as uuidv4 } from "uuid";

import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  addTransactionMetadata,
  LUT_PROGRAM_AUTHORITY_INDEX,
  nativeToUi,
  SolanaTransaction,
  uiToNative,
} from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  ActionTxns,
  deserializeInstruction,
  executeSwapLendAction,
  getAdressLookupTableAccounts,
  getSwapQuoteWithRetry,
  handleSimulationError,
  IndividualFlowError,
  MarginfiActionParams,
  STATIC_SIMULATION_ERRORS,
  SwapLendActionTxns,
} from "@mrgnlabs/mrgn-utils";
import { Transaction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { ActionSummary, CalculatePreviewProps, SimulatedActionPreview } from "../../lend-box/utils";
import {
  ActionPreview,
  simulatedCollateral,
  simulatedHealthFactor,
  simulatedPositionSize,
} from "~/components/action-box-v2/utils";
import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types/actions.types";

export interface GenerateSwapLendTxnsProps {
  marginfiAccount: MarginfiAccountWrapper;
  depositBank: ExtendedBankInfo;
  swapBank?: ExtendedBankInfo | null;
  amount: number;
  marginfiClient: MarginfiClient;
  slippageBps: number;
}

export async function generateSwapLendTxns(
  props: GenerateSwapLendTxnsProps
): Promise<SwapLendActionTxns | ActionMessageType> {
  console.log(props);

  let swapTx: { quote?: QuoteResponse; tx?: SolanaTransaction; error?: ActionMessageType } | undefined;

  if (props.swapBank && props.swapBank.meta.tokenSymbol !== props.depositBank.meta.tokenSymbol) {
    console.log("Creating Quote swap transaction...");
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

  // TODO: Do we need to handle marginfi account creation here?

  let finalDepositAmount = props.amount;

  if (props.swapBank && !swapTx?.quote) {
    return STATIC_SIMULATION_ERRORS.CREATE_SWAP_FAILED;
  } else if (props.swapBank && swapTx?.quote) {
    finalDepositAmount = Number(nativeToUi(swapTx?.quote?.outAmount, props.depositBank.info.state.mintDecimals));
  }

  const depositTx = await props.marginfiAccount.makeDepositTx(finalDepositAmount, props.depositBank.address);

  return {
    actionTxn: depositTx,
    additionalTxns: [...(swapTx?.tx ? [swapTx.tx] : [])],
    actionQuote: swapTx?.quote ?? null,
  };
}

export async function createSwapTx(props: GenerateSwapLendTxnsProps) {
  if (!props.swapBank) {
    console.error("Swap bank is required");
    throw new Error("Swap bank is required");
  }

  try {
    const jupiterQuoteApi = createJupiterApiClient();

    const swapQuote = await getSwapQuoteWithRetry({
      swapMode: "ExactIn",
      amount: uiToNative(props.amount, 6).toNumber(),
      inputMint: props.swapBank.info.state.mint.toBase58(),
      outputMint: props.depositBank.info.state.mint.toBase58(),
      slippageBps: props.slippageBps,
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
    // todo: should we not inspect multiple banks?
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
}: CalculatePreviewProps): ActionSummary {
  let simulationPreview: SimulatedActionPreview | null = null;

  if (simulationResult) {
    simulationPreview = calculateSimulatedActionPreview(simulationResult, bank);
  }

  const actionPreview = calculateActionPreview(bank, actionMode, accountSummary);

  return {
    actionPreview,
    simulationPreview,
  } as ActionSummary;
}

function calculateActionPreview(
  bank: ExtendedBankInfo,
  actionMode: ActionType,
  accountSummary: AccountSummary
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

  return {
    positionAmount,
    health,
    liquidationPrice,
    poolSize,
    bankCap,
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
