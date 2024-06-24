import { QuoteGetRequest, QuoteResponse, createJupiterApiClient } from "@jup-ag/api";
import {
  Bank,
  MarginRequirementType,
  MarginfiAccountWrapper,
  MarginfiClient,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { LUT_PROGRAM_AUTHORITY_INDEX, Wallet, nativeToUi, uiToNative } from "@mrgnlabs/mrgn-common";
import { AddressLookupTableAccount, Connection, VersionedTransaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import {
  deserializeInstruction,
  extractErrorString,
  getAdressLookupTableAccounts,
  getSwapQuoteWithRetry,
} from "~/utils";
import { MultiStepToastHandle, showErrorToast } from "~/utils/toastUtils";

export interface LoopingObject {
  loopingTxn: VersionedTransaction;
  quote: QuoteResponse;
  borrowAmount: BigNumber;
  actualDepositAmount: number;
}

export async function calculateLooping(
  marginfiAccount: MarginfiAccountWrapper,
  depositBank: ExtendedBankInfo, // deposit
  borrowBank: ExtendedBankInfo, // borrow
  targetLeverage: number,
  amount: number,
  slippageBpsa: number,
  connection: Connection
): Promise<LoopingObject | null> {
  const slippageBps = 0.1 * 1000;

  console.log("bank A: " + depositBank.meta.tokenSymbol);
  console.log("bank B: " + borrowBank.meta.tokenSymbol);
  console.log("leverage: " + targetLeverage);
  console.log("amount: " + amount);
  console.log("slippageBps: " + slippageBps);

  const principalBufferAmountUi = amount * targetLeverage * (slippageBps / 10000);
  const adjustedPrincipalAmountUi = amount - principalBufferAmountUi;

  const { borrowAmount, totalDepositAmount: depositAmount } = marginfiAccount.computeLoopingParams(
    adjustedPrincipalAmountUi,
    targetLeverage,
    depositBank.address,
    borrowBank.address
  );

  console.log("borrowAmount: " + borrowAmount.toString());

  const borrowAmountNative = uiToNative(borrowAmount, borrowBank.info.state.mintDecimals).toNumber();

  const maxLoopAmount = depositBank.isActive ? depositBank?.position.amount : 0;

  const maxAccountsArr = [undefined, 50, 40, 30];

  let firstQuote;

  for (const maxAccounts of maxAccountsArr) {
    const quoteParams = {
      amount: borrowAmountNative,
      inputMint: borrowBank.info.state.mint.toBase58(), // borrow
      outputMint: depositBank.info.state.mint.toBase58(), // deposit
      slippageBps: slippageBps,
      maxAccounts: maxAccounts,
      swapMode: "ExactIn",
    } as QuoteGetRequest;
    try {
      const swapQuote = await getSwapQuoteWithRetry(quoteParams);

      if (!maxAccounts) {
        firstQuote = swapQuote;
      }

      if (swapQuote) {
        const minSwapAmountOutUi = nativeToUi(swapQuote.otherAmountThreshold, depositBank.info.state.mintDecimals);
        const actualDepositAmountUi = minSwapAmountOutUi + amount;

        console.log({ actualDepositAmountUi });

        const txn = await verifyJupTxSizeLooping(
          marginfiAccount,
          depositBank,
          borrowBank,
          actualDepositAmountUi,
          borrowAmount,
          swapQuote,
          connection
        );
        if (txn) {
          // capture("looper", {
          //   amountIn: uiToNative(amount, borrowBank.info.state.mintDecimals).toNumber(),
          //   firstQuote,
          //   bestQuote: swapQuote,
          //   inputMint: borrowBank.info.state.mint.toBase58(),
          //   outputMint: bank.info.state.mint.toBase58(),
          // });
          return {
            loopingTxn: txn,
            quote: swapQuote,
            borrowAmount: borrowAmount,
            actualDepositAmount: actualDepositAmountUi,
          };
        }
      } else {
        throw new Error("Swap quote failed");
      }
    } catch (error) {
      console.error(error);
      // capture("looper", {
      //   amountIn: uiToNative(amount, borrowBank.info.state.mintDecimals).toNumber(),
      //   firstQuote,
      //   inputMint: borrowBank.info.state.mint.toBase58(),
      //   outputMint: bank.info.state.mint.toBase58(),
      // });
      return null;
    }
  }
  return null;
}

export async function verifyJupTxSizeLooping(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo,
  loopingBank: ExtendedBankInfo,
  depositAmount: number,
  borrowAmount: BigNumber,
  quoteResponse: QuoteResponse,
  connection: Connection
) {
  try {
    const builder = await loopingBuilder({
      marginfiAccount,
      bank,
      depositAmount,
      options: {
        loopingQuote: quoteResponse,
        borrowAmount,
        loopingBank,
        connection,
        loopingTxn: null,
      },
    });

    return checkTxSize(builder);
  } catch (error) {
    console.error(error);
  }
}

const checkTxSize = (builder: {
  txn: VersionedTransaction;
  addressLookupTableAccounts: AddressLookupTableAccount[];
}) => {
  const totalSize = builder.txn.message.serialize().length;
  const totalKeys = builder.txn.message.getAccountKeys({
    addressLookupTableAccounts: builder.addressLookupTableAccounts,
  }).length;

  if (totalSize > 1232 || totalKeys >= 64) {
    // too big
  } else {
    return builder.txn;
  }
};

export async function loopingBuilder({
  marginfiAccount,
  bank,
  depositAmount,
  options,
  priorityFee,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  depositAmount: number;
  options: LoopingOptions;
  priorityFee?: number;
}) {
  const jupiterQuoteApi = createJupiterApiClient();

  // get fee account for original borrow mint
  //const feeAccount = await getFeeAccount(bank.info.state.mint);

  const { swapInstruction, addressLookupTableAddresses } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: options.loopingQuote,
      userPublicKey: marginfiAccount.authority.toBase58(),
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
    },
  });

  // const setupIxs = setupInstructions.length > 0 ? setupInstructions.map(deserializeInstruction) : []; //**not optional but man0s smart**
  const swapIx = deserializeInstruction(swapInstruction);
  // const swapcleanupIx = cleanupInstruction ? [deserializeInstruction(cleanupInstruction)] : []; **optional**
  // tokenLedgerInstruction **also optional**

  const swapLUTs: AddressLookupTableAccount[] = [];
  swapLUTs.push(...(await getAdressLookupTableAccounts(options.connection, addressLookupTableAddresses)));

  const { transaction, addressLookupTableAccounts } = await marginfiAccount.makeLoopTx(
    depositAmount,
    options.borrowAmount,
    bank.address,
    options.loopingBank.address,
    [swapIx],
    swapLUTs,
    priorityFee
  );

  return { txn: transaction, addressLookupTableAccounts };
}

export type LoopingOptions = {
  loopingQuote: QuoteResponse;
  loopingTxn: VersionedTransaction | null;
  borrowAmount: BigNumber;
  loopingBank: ExtendedBankInfo;
  connection: Connection;
};

export async function looping({
  marginfiClient,
  marginfiAccount,
  bank,
  depositAmount,
  options,
  priorityFee,
}: {
  marginfiClient: MarginfiClient | null;
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  depositAmount: number;
  options: LoopingOptions;
  priorityFee?: number;
}) {
  if (marginfiClient === null) {
    showErrorToast("Marginfi client not ready");
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Looping", [
    { label: `Executing looping ${bank.meta.tokenSymbol} with ${options.loopingBank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    let txn: VersionedTransaction;

    if (options.loopingTxn) {
      txn = options.loopingTxn;
    } else {
      txn = (await loopingBuilder({ marginfiAccount, bank, depositAmount, options, priorityFee })).txn;
    }
    const sig = await marginfiClient.processTransaction(txn);
    multiStepToast.setSuccessAndNext();
    return sig;
  } catch (error: any) {
    const msg = extractErrorString(error);
    //   Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while looping: ${msg}`);
    console.log(error);
    return;
  }
}

export interface SimulateLoopingActionProps {
  marginfiClient: MarginfiClient;
  account: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  loopingTxn: VersionedTransaction | null;
}

export async function simulateLooping({ marginfiClient, account, bank, loopingTxn }: SimulateLoopingActionProps) {
  let simulationResult: SimulationResult;

  if (loopingTxn && marginfiClient) {
    const [mfiAccountData, bankData] = await marginfiClient.simulateTransaction(loopingTxn, [
      account.address,
      bank.address,
    ]);
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate looping");
    const previewBanks = marginfiClient.banks;
    previewBanks.set(bank.address.toBase58(), Bank.fromBuffer(bank.address, bankData));
    const previewClient = new MarginfiClient(
      marginfiClient.config,
      marginfiClient.program,
      {} as Wallet,
      true,
      marginfiClient.group,
      marginfiClient.banks,
      marginfiClient.oraclePrices
    );
    const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
      account.address,
      previewClient,
      mfiAccountData
    );

    return (simulationResult = {
      banks: previewBanks,
      marginfiAccount: previewMarginfiAccount,
    });
  }
}

export async function calculatePreview(simulationResult: SimulationResult, bank: ExtendedBankInfo) {
  let simulationPreview: any | undefined = undefined;

  const { assets, liabilities } = simulationResult.marginfiAccount.computeHealthComponents(
    MarginRequirementType.Maintenance
  );
  const { assets: assetsInit } = simulationResult.marginfiAccount.computeHealthComponents(
    MarginRequirementType.Initial
  );

  const health = assets.minus(liabilities).dividedBy(assets).toNumber();
  const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBank(bank.address);
  const { lendingRate, borrowingRate } = simulationResult.banks.get(bank.address.toBase58())!.computeInterestRates();

  const position = simulationResult.marginfiAccount.activeBalances.find(
    (b) => b.active && b.bankPk.equals(bank.address)
  );
  let positionAmount = 0;
  if (position && position.liabilityShares.gt(0)) {
    positionAmount = position.computeQuantityUi(bank.info.rawBank).liabilities.toNumber();
  } else if (position && position.assetShares.gt(0)) {
    positionAmount = position.computeQuantityUi(bank.info.rawBank).assets.toNumber();
  }
  const availableCollateral = simulationResult.marginfiAccount.computeFreeCollateral().toNumber();

  simulationPreview = {
    health,
    liquidationPrice,
    depositRate: lendingRate.toNumber(),
    borrowRate: borrowingRate.toNumber(),
    positionAmount,
    availableCollateral: {
      amount: availableCollateral,
      ratio: availableCollateral / assetsInit.toNumber(),
    },
  };
}

// const currentPositionAmount = bank?.isActive ? bank.position.amount : 0;
// const healthFactor = !accountSummary.balance || !accountSummary.healthFactor ? 1 : accountSummary.healthFactor;
// const liquidationPrice =
//   bank.isActive && bank.position.liquidationPrice && bank.position.liquidationPrice > 0.01
//     ? bank.position.liquidationPrice
//     : undefined;

//   return (

//   )
// }
