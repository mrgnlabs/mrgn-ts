import { QuoteGetRequest, QuoteResponse, createJupiterApiClient } from "@jup-ag/api";
import {
  Bank,
  MarginRequirementType,
  MarginfiAccountWrapper,
  MarginfiClient,
  OperationalState,
  SimulationResult,
  computeLoopingParams,
} from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  LUT_PROGRAM_AUTHORITY_INDEX,
  Wallet,
  nativeToUi,
  percentFormatter,
  uiToNative,
  usdFormatter,
} from "@mrgnlabs/mrgn-common";
import { AddressLookupTableAccount, Connection, VersionedTransaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { IconArrowRight, IconPyth, IconSwitchboard } from "~/components/ui/icons";
import {
  ActionMethodType,
  deserializeInstruction,
  extractErrorString,
  getAdressLookupTableAccounts,
  getSwapQuoteWithRetry,
  isBankOracleStale,
} from "~/utils";
import { MultiStepToastHandle, showErrorToast } from "~/utils/toastUtils";

export type TradeSide = "long" | "short";

export interface LoopingObject {
  loopingTxn: VersionedTransaction | null;
  quote: QuoteResponse;
  borrowAmount: BigNumber;
  actualDepositAmount: number;
}

export async function calculateLooping(
  marginfiClient: MarginfiClient,
  marginfiAccount: MarginfiAccountWrapper | null,
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

  try {
    const depositPriceInfo = marginfiClient.oraclePrices.get(depositBank.address.toBase58());
    const borrowPriceInfo = marginfiClient.oraclePrices.get(borrowBank.address.toBase58());

    if (!depositPriceInfo) throw Error(`Price info for ${depositBank.address.toBase58()} not found`);
    if (!borrowPriceInfo) throw Error(`Price info for ${borrowBank.address.toBase58()} not found`);

    const { borrowAmount, totalDepositAmount: depositAmount } = computeLoopingParams(
      adjustedPrincipalAmountUi,
      targetLeverage,
      depositBank.info.rawBank,
      borrowBank.info.rawBank,
      depositPriceInfo,
      borrowPriceInfo
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

          let txn: VersionedTransaction | undefined;

          if (marginfiAccount) {
            txn = await verifyJupTxSizeLooping(
              marginfiAccount,
              depositBank,
              borrowBank,
              actualDepositAmountUi,
              borrowAmount,
              swapQuote,
              connection
            );
          }

          if (txn || !marginfiAccount) {
            // capture("looper", {
            //   amountIn: uiToNative(amount, borrowBank.info.state.mintDecimals).toNumber(),
            //   firstQuote,
            //   bestQuote: swapQuote,
            //   inputMint: borrowBank.info.state.mint.toBase58(),
            //   outputMint: bank.info.state.mint.toBase58(),
            // });
            return {
              loopingTxn: txn ?? null,
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
  } catch (error) {
    console.error(error);
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
  try {
    const totalSize = builder.txn.message.serialize().length;
    const totalKeys = builder.txn.message.getAccountKeys({
      addressLookupTableAccounts: builder.addressLookupTableAccounts,
    }).length;

    console.log({ totalSize });

    if (totalSize > 1158 || totalKeys >= 64) {
      throw new Error("TX doesn't fit");
    } else {
      return builder.txn;
    }
  } catch (error) {
    // too big
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
    priorityFee,
    false
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

export async function simulateLooping({
  marginfiClient,
  account,
  bank,
  loopingTxn,
}: SimulateLoopingActionProps): Promise<SimulationResult | null> {
  let simulationResult: SimulationResult;

  if (loopingTxn && marginfiClient) {
    const [mfiAccountData, bankData] = await marginfiClient.simulateTransaction(loopingTxn, [
      account.address,
      bank.address,
    ]);
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate looping");
    const previewBanks = marginfiClient.banks;
    previewBanks.set(bank.address.toBase58(), Bank.fromBuffer(bank.address, bankData, marginfiClient.program.idl));
    const previewClient = new MarginfiClient(
      marginfiClient.config,
      marginfiClient.program,
      {} as Wallet,
      true,
      marginfiClient.group,
      marginfiClient.banks,
      marginfiClient.oraclePrices,
      marginfiClient.mintDatas
    );
    const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
      account.address,
      previewClient,
      mfiAccountData,
      marginfiClient.program.idl
    );

    return {
      banks: previewBanks,
      marginfiAccount: previewMarginfiAccount,
    };
  }
  return null;
}

export function generateStats(
  accountSummary: AccountSummary,
  tokenBank: ExtendedBankInfo,
  usdcBank: ExtendedBankInfo,
  simulationResult: SimulationResult | null
) {
  let simStats: StatResult | null = null;

  if (simulationResult) {
    simStats = getSimulationStats(simulationResult, tokenBank, usdcBank);
  }

  const currentStats = getCurrentStats(accountSummary, tokenBank, usdcBank);

  const currentLiqPrice = currentStats.liquidationPrice ? usdFormatter.format(currentStats.liquidationPrice) : null;
  const simulatedLiqPrice = simStats?.liquidationPrice ? usdFormatter.format(simStats?.liquidationPrice) : null;
  const showLiqComparison = currentLiqPrice && simulatedLiqPrice;

  let oracle = "";
  switch (tokenBank?.info.rawBank.config.oracleSetup) {
    case "PythEma":
      oracle = "Pyth";
      break;
    case "SwitchboardV2":
      oracle = "Switchboard";
      break;
  }

  return (
    <dl className="w-full grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
      <dt>Entry Price</dt>
      <dd className="text-primary text-right">{usdFormatter.format(tokenBank.info.state.price)}</dd>
      <dt>Liquidation Price</dt>
      <dd className="text-primary text-right flex flex-row gap-2">
        {currentLiqPrice && <span>{currentLiqPrice}</span>}
        {showLiqComparison && <IconArrowRight width={12} height={12} />}
        {simulatedLiqPrice && <span>{simulatedLiqPrice}</span>}
      </dd>
      <dt>Oracle</dt>
      <dd className="text-primary flex items-center gap-1 ml-auto">
        {oracle}
        {oracle === "Pyth" ? <IconPyth size={14} /> : <IconSwitchboard size={14} />}
      </dd>
      <dt>Total Longed</dt>
      <dd className="text-primary text-right">
        {tokenBank.info.state.totalDeposits.toFixed(2)} {tokenBank.meta.tokenSymbol}
      </dd>
      <dt>Total Shorted</dt>
      <dd className="text-primary text-right">
        {tokenBank.info.state.totalBorrows.toFixed(2)} {tokenBank.meta.tokenSymbol}
      </dd>
    </dl>
  );

  // health comparison
}

interface StatResult {
  tokenPositionAmount: number;
  usdcPositionAmount: number;
  healthFactor: number;
  liquidationPrice: number | null;
}

export function getSimulationStats(
  simulationResult: SimulationResult,
  tokenBank: ExtendedBankInfo,
  usdcBank: ExtendedBankInfo
): StatResult {
  let simulationPreview: any | undefined = undefined;

  const { assets, liabilities } = simulationResult.marginfiAccount.computeHealthComponents(
    MarginRequirementType.Maintenance
  );
  const { assets: assetsInit } = simulationResult.marginfiAccount.computeHealthComponents(
    MarginRequirementType.Initial
  );

  const healthFactor = assets.minus(liabilities).dividedBy(assets).toNumber();
  const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBank(tokenBank.address);
  // const { lendingRate, borrowingRate } = simulationResult.banks.get(bank.address.toBase58())!.computeInterestRates();

  // Token position
  const tokenPosition = simulationResult.marginfiAccount.activeBalances.find(
    (b) => b.active && b.bankPk.equals(tokenBank.address)
  );
  let tokenPositionAmount = 0;
  if (tokenPosition && tokenPosition.liabilityShares.gt(0)) {
    tokenPositionAmount = tokenPosition.computeQuantityUi(tokenBank.info.rawBank).liabilities.toNumber();
  } else if (tokenPosition && tokenPosition.assetShares.gt(0)) {
    tokenPositionAmount = tokenPosition.computeQuantityUi(tokenBank.info.rawBank).assets.toNumber();
  }

  // usdc position
  const usdcPosition = simulationResult.marginfiAccount.activeBalances.find(
    (b) => b.active && b.bankPk.equals(usdcBank.address)
  );
  let usdcPositionAmount = 0;
  if (usdcPosition && usdcPosition.liabilityShares.gt(0)) {
    usdcPositionAmount = usdcPosition.computeQuantityUi(usdcBank.info.rawBank).liabilities.toNumber();
  } else if (usdcPosition && usdcPosition.assetShares.gt(0)) {
    usdcPositionAmount = usdcPosition.computeQuantityUi(usdcBank.info.rawBank).assets.toNumber();
  }

  const availableCollateral = simulationResult.marginfiAccount.computeFreeCollateral().toNumber();

  return {
    tokenPositionAmount,
    usdcPositionAmount,
    healthFactor,
    liquidationPrice,
    // depositRate: lendingRate.toNumber(),
    // borrowRate: borrowingRate.toNumber(),
    // availableCollateral: {
    //   amount: availableCollateral,
    //   ratio: availableCollateral / assetsInit.toNumber(),
    // },
  };
}

export function getCurrentStats(
  accountSummary: AccountSummary,
  tokenBank: ExtendedBankInfo,
  usdcBank: ExtendedBankInfo
): StatResult {
  const tokenPositionAmount = tokenBank?.isActive ? tokenBank.position.amount : 0;
  const usdcPositionAmount = usdcBank?.isActive ? usdcBank.position.amount : 0;
  const healthFactor = !accountSummary.balance || !accountSummary.healthFactor ? 1 : accountSummary.healthFactor;

  // always token asset liq price
  const liquidationPrice =
    tokenBank.isActive && tokenBank.position.liquidationPrice && tokenBank.position.liquidationPrice > 0.01
      ? tokenBank.position.liquidationPrice
      : null;

  // const poolSize = isLending
  //   ? bank.info.state.totalDeposits
  //   : Math.max(
  //       0,
  //       Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit.toNumber()) -
  //         bank.info.state.totalBorrows
  //     );
  // const bankCap = nativeToUi(
  //   isLending ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit,
  //   bank.info.state.mintDecimals
  // );

  return {
    tokenPositionAmount,
    usdcPositionAmount,
    healthFactor,
    liquidationPrice,
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

export interface ActionMethod {
  isEnabled: boolean;
  actionMethod?: ActionMethodType;
  description?: string;
  link?: string;
  action?: {
    bank: ExtendedBankInfo;
    type: ActionType;
  };
}

interface ActiveGroup {
  token: ExtendedBankInfo;
  usdc: ExtendedBankInfo;
}

interface CheckActionAvailableProps {
  amount: string;
  connected: boolean;
  activeGroup: ActiveGroup | null;
  loopingObject: LoopingObject | null;
  tradeSide: TradeSide;
}

export function checkLoopingActionAvailable({
  amount,
  connected,
  activeGroup,
  loopingObject,
  tradeSide,
}: CheckActionAvailableProps): ActionMethod[] {
  let checks: ActionMethod[] = [];

  const requiredCheck = getRequiredCheck(connected, activeGroup, loopingObject);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount);
  if (generalChecks) checks.push(...generalChecks);

  // allert checks
  if (activeGroup && loopingObject) {
    const lentChecks = canBeLooped(activeGroup, loopingObject, tradeSide);
    if (lentChecks.length) checks.push(...lentChecks);

    // case ActionType.MintYBX:
    //   if (check) checks.push(check);
    //   break;
  }

  if (checks.length === 0)
    checks.push({
      isEnabled: true,
    });

  return checks;
}

function getRequiredCheck(
  connected: boolean,
  activeGroup: ActiveGroup | null,
  loopingObject: LoopingObject | null
): ActionMethod | null {
  if (!connected) {
    return { isEnabled: false };
  }
  if (!activeGroup) {
    return { isEnabled: false };
  }
  if (!loopingObject) {
    return { isEnabled: false };
  }

  return null;
}

function getGeneralChecks(amount: string): ActionMethod[] {
  let checks: ActionMethod[] = [];

  try {
    if (Number(amount) === 0) {
      checks.push({ isEnabled: false });
    }
    return checks;
  } catch {
    checks.push({ isEnabled: false });
    return checks;
  }
}

function canBeLooped(activeGroup: ActiveGroup, loopingObject: LoopingObject, tradeSide: TradeSide): ActionMethod[] {
  let checks: ActionMethod[] = [];
  const isUsdcBankPaused = activeGroup.usdc.info.rawBank.config.operationalState === OperationalState.Paused;
  const isTokenBankPaused = activeGroup.token.info.rawBank.config.operationalState === OperationalState.Paused;

  let hasTokenSupplied,
    hasUsdcSupplied = false;

  if (activeGroup.usdc.isActive) {
    hasUsdcSupplied = activeGroup.usdc.position.isLending;
  }

  if (activeGroup.token.isActive) {
    hasTokenSupplied = activeGroup.token.position.isLending;
  }

  const wrongPositionActive =
    tradeSide === "long" ? hasUsdcSupplied || !hasTokenSupplied : !hasUsdcSupplied || hasTokenSupplied;

  if (isUsdcBankPaused) {
    checks.push({
      description: `The ${activeGroup.usdc.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    });
  }

  if (isTokenBankPaused) {
    checks.push({
      description: `The ${activeGroup.token.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    });
  }

  if (wrongPositionActive && loopingObject.loopingTxn) {
    const wrongSupplied = tradeSide === "long" ? hasUsdcSupplied : hasTokenSupplied;
    const wrongBorrowed = tradeSide === "long" ? !hasTokenSupplied : !hasUsdcSupplied;

    if (wrongSupplied && wrongBorrowed) {
      checks.push({
        description: `You are already ${
          tradeSide === "long" ? "shorting" : "longing"
        } this asset, you need to close that position first to start ${tradeSide === "long" ? "longing" : "shorting"}.`,
        isEnabled: false,
        action: {
          type: ActionType.Repay,
          bank: tradeSide === "long" ? activeGroup.usdc : activeGroup.token,
        },
      });
    } else if (wrongSupplied) {
      checks.push({
        description: `Before you can ${tradeSide} this asset, you'll need to withdraw your supplied ${
          tradeSide === "long" ? activeGroup.usdc.meta.tokenSymbol : activeGroup.token.meta.tokenSymbol
        }.`,
        isEnabled: true,
        action: {
          type: ActionType.Withdraw,
          bank: tradeSide === "long" ? activeGroup.usdc : activeGroup.token,
        },
      });
    } else if (wrongBorrowed) {
      checks.push({
        description: `Before you can ${tradeSide} this asset, you'll need to repay your borrowed ${
          tradeSide === "long" ? activeGroup.token.meta.tokenSymbol : activeGroup.usdc.meta.tokenSymbol
        }.`,
        isEnabled: false,
        action: {
          type: ActionType.Repay,
          bank: tradeSide === "long" ? activeGroup.token : activeGroup.usdc,
        },
      });
    }
  }

  const priceImpactPct = loopingObject.quote.priceImpactPct;

  if (priceImpactPct && Number(priceImpactPct) > 0.01) {
    //invert
    if (priceImpactPct && Number(priceImpactPct) > 0.05) {
      checks.push({
        description: `Price impact is ${percentFormatter.format(Number(priceImpactPct))}.`,
        actionMethod: "ERROR",
        isEnabled: true,
      });
    } else {
      checks.push({
        description: `Price impact is ${percentFormatter.format(Number(priceImpactPct))}.`,
        isEnabled: true,
      });
    }
  }

  if (
    (activeGroup.token && isBankOracleStale(activeGroup.token)) ||
    (activeGroup.usdc && isBankOracleStale(activeGroup.usdc))
  ) {
    checks.push({
      description: "The oracle data for this bank is stale",
      isEnabled: true,
      link: "https://forum.marginfi.community/t/work-were-doing-to-improve-oracle-robustness-during-chain-congestion/283",
    });
  }

  return checks;
}
