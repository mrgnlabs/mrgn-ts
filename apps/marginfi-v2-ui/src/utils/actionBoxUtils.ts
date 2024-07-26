import { floor, percentFormatter, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo, ExtendedBankInfo, FEE_MARGIN } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  MarginfiAccountWrapper,
  MarginRequirementType,
  OperationalState,
  RiskTier,
} from "@mrgnlabs/marginfi-client-v2";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import { createJupiterApiClient, QuoteGetRequest, QuoteResponse } from "@jup-ag/api";
import { AddressLookupTableAccount, Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

import { StakeData, isBankOracleStale, loopingBuilder, repayWithCollatBuilder } from "~/utils";
import BigNumber from "bignumber.js";

export enum RepayType {
  RepayRaw = "Repay",
  RepayCollat = "Collateral Repay",
}

export enum LstType {
  Token = "Token",
  Native = "Native Stake",
}

export enum YbxType {
  MintYbx = "Mint YBX",
  WithdrawCollat = "Withdraw Collateral",
  AddCollat = "Add Collateral",
  RepayYbx = "Repay",
}

export type ActionMethodType = "WARNING" | "ERROR" | "INFO";
export interface ActionMethod {
  isEnabled: boolean;
  actionMethod?: ActionMethodType;
  description?: string;
  link?: string;
  linkText?: string;
}

export function getColorForActionMethodType(type?: ActionMethodType) {
  if (type === "INFO") {
    return "info";
  } else if (type === "WARNING") {
    return "alert";
  } else {
    return "alert";
  }
}

interface CheckActionAvailableProps {
  amount: number | null;
  repayAmount: number | null;
  connected: boolean;
  nativeSolBalance: number;
  showCloseBalance?: boolean;
  selectedBank: ExtendedBankInfo | null;
  selectedRepayBank: ExtendedBankInfo | null;
  selectedStakingAccount: StakeData | null;
  extendedBankInfos: ExtendedBankInfo[];
  marginfiAccount: MarginfiAccountWrapper | null;
  actionMode: ActionType;
  blacklistRoutes: PublicKey[] | null;
  repayMode: RepayType;
  repayCollatQuote: QuoteResponse | null;
  lstQuoteMeta: QuoteResponseMeta | null;
}

export function checkActionAvailable({
  amount,
  repayAmount,
  nativeSolBalance,
  connected,
  showCloseBalance,
  selectedBank,
  selectedRepayBank,
  selectedStakingAccount,
  extendedBankInfos,
  marginfiAccount,
  actionMode,
  blacklistRoutes,
  repayMode,
  repayCollatQuote,
  lstQuoteMeta,
}: CheckActionAvailableProps): ActionMethod[] {
  let checks: ActionMethod[] = [];

  const requiredCheck = getRequiredCheck(connected, selectedBank, selectedStakingAccount);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount ?? 0, repayAmount ?? 0, showCloseBalance);
  if (generalChecks) checks.push(...generalChecks);

  // allert checks
  if (selectedBank) {
    switch (actionMode) {
      case ActionType.Deposit:
        const lentChecks = canBeLent(selectedBank, nativeSolBalance);
        if (lentChecks.length) checks.push(...lentChecks);
        break;
      case ActionType.Withdraw:
        const withdrawChecks = canBeWithdrawn(selectedBank, marginfiAccount);
        if (withdrawChecks.length) checks.push(...withdrawChecks);
        break;
      case ActionType.Borrow:
        const borrowChecks = canBeBorrowed(selectedBank, extendedBankInfos, marginfiAccount);
        if (borrowChecks.length) checks.push(...borrowChecks);
        break;
      case ActionType.Loop:
        const loopChecks = canBeLooped(selectedBank, selectedRepayBank, repayCollatQuote);
        if (loopChecks.length) checks.push(...loopChecks);
        break;
      case ActionType.Repay:
        let repayChecks;
        if (repayMode === RepayType.RepayRaw) {
          repayChecks = canBeRepaid(selectedBank);
        } else if (repayMode === RepayType.RepayCollat) {
          repayChecks = canBeRepaidCollat(selectedBank, selectedRepayBank, blacklistRoutes, repayCollatQuote);
        }
        if (repayChecks) checks.push(...repayChecks);
        break;
      case ActionType.MintLST:
        const lstStakeChecks = canBeLstStaked(lstQuoteMeta);
        if (lstStakeChecks) checks.push(...lstStakeChecks);
        break;
      case ActionType.UnstakeLST:
        const lstUnstakeChecks = canBeLstStaked(lstQuoteMeta);
        if (lstUnstakeChecks) checks.push(...lstUnstakeChecks);
        break;

      // case ActionType.MintYBX:
      //   if (check) checks.push(check);
      //   break;
    }
  }

  if (checks.length === 0)
    checks.push({
      isEnabled: true,
    });

  return checks;
}

function getRequiredCheck(
  connected: boolean,
  selectedBank: ExtendedBankInfo | null,
  selectedStakingAccount: StakeData | null
): ActionMethod | null {
  if (!connected) {
    return { isEnabled: false };
  }
  if (!selectedBank && !selectedStakingAccount) {
    return { isEnabled: false };
  }

  return null;
}

function getGeneralChecks(amount: number = 0, repayAmount: number = 0, showCloseBalance?: boolean): ActionMethod[] {
  let checks: ActionMethod[] = [];
  if (showCloseBalance) {
    checks.push({ actionMethod: "INFO", description: "Close lending balance.", isEnabled: true });
  }

  if (amount === 0 && repayAmount === 0) {
    checks.push({ isEnabled: false });
  }

  return checks;
}

function canBeWithdrawn(
  targetBankInfo: ExtendedBankInfo,
  marginfiAccount: MarginfiAccountWrapper | null
): ActionMethod[] {
  let checks: ActionMethod[] = [];
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  if (isPaused) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    });
  }

  if (!targetBankInfo.isActive) {
    checks.push({
      description: "No position found.",
      isEnabled: false,
    });
  }

  if (targetBankInfo.isActive && !targetBankInfo.position.isLending) {
    checks.push({
      description: `You&apos;re not lending ${targetBankInfo.meta.tokenSymbol}.`,
      isEnabled: false,
    });
  }

  const noFreeCollateral = marginfiAccount && marginfiAccount.computeFreeCollateral().isZero();
  if (noFreeCollateral) {
    checks.push({
      description: "No available collateral.",
      isEnabled: true,
    });
  }

  if (targetBankInfo && isBankOracleStale(targetBankInfo)) {
    checks.push({
      description:
        "Withdrawals from this bank may fail due to network congestion preventing oracles from updating price data.",
      isEnabled: true,
      link: "https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean",
      linkText: "Learn more about marginfi's decentralized oracles.",
    });
  }

  return checks;
}

function canBeRepaid(targetBankInfo: ExtendedBankInfo): ActionMethod[] {
  let checks: ActionMethod[] = [];
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  if (isPaused) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    });
  }

  if (!targetBankInfo.isActive) {
    checks.push({
      description: "No position found.",
      isEnabled: false,
    });
  }

  if (targetBankInfo.isActive && targetBankInfo.position.isLending) {
    checks.push({
      description: `You are not borrowing ${targetBankInfo.meta.tokenSymbol}.`,
      isEnabled: false,
    });
  }

  if (targetBankInfo.userInfo.maxRepay === 0) {
    checks.push({
      description: `Insufficient ${targetBankInfo.meta.tokenSymbol} in wallet for loan repayment.`,
      isEnabled: false,
    });
  }

  return checks;
}

function canBeRepaidCollat(
  targetBankInfo: ExtendedBankInfo,
  repayBankInfo: ExtendedBankInfo | null,
  blacklistRoutes: PublicKey[] | null,
  swapQuote: QuoteResponse | null
): ActionMethod[] {
  let checks: ActionMethod[] = [];
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;

  if (isPaused) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    });
  }

  if (!targetBankInfo.isActive) {
    checks.push({
      description: "No position found.",
      isEnabled: false,
    });
  }

  if (targetBankInfo.isActive && targetBankInfo.position.isLending) {
    checks.push({
      description: `You are not borrowing ${targetBankInfo.meta.tokenSymbol}.`,
      isEnabled: false,
    });
  }

  if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.01) {
    //invert
    if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.05) {
      checks.push({
        description: `Price impact is ${percentFormatter.format(Number(swapQuote.priceImpactPct))}.`,
        actionMethod: "ERROR",
        isEnabled: true,
      });
    } else {
      checks.push({
        description: `Price impact is ${percentFormatter.format(Number(swapQuote.priceImpactPct))}.`,
        isEnabled: true,
      });
    }
  }

  if (!swapQuote) {
    checks.push({ isEnabled: false });
  }

  if ((repayBankInfo && isBankOracleStale(repayBankInfo)) || (targetBankInfo && isBankOracleStale(targetBankInfo))) {
    checks.push({
      description:
        "Repays to this bank may fail due to network congestion preventing oracles from updating price data.",
      isEnabled: true,
      link: "https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean",
      linkText: "Learn more about marginfi's decentralized oracles.",
    });
  }

  if (targetBankInfo.userInfo.tokenAccount.balance > 0) {
    checks.push({
      description: `You have ${targetBankInfo.meta.tokenSymbol} in your wallet and can repay without using collateral.`,
      isEnabled: true,
      actionMethod: "INFO",
    });
  }

  return checks;
}

function canBeLooped(
  targetBankInfo: ExtendedBankInfo,
  repayBankInfo: ExtendedBankInfo | null,
  swapQuote: QuoteResponse | null
): ActionMethod[] {
  let checks: ActionMethod[] = [];
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;

  if (isPaused) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    });
  }

  if (!swapQuote) {
    checks.push({
      isEnabled: false,
    });
  }

  if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.01) {
    //invert
    if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.05) {
      checks.push({
        description: `Price impact is ${percentFormatter.format(Number(swapQuote.priceImpactPct))}.`,
        actionMethod: "ERROR",
        isEnabled: true,
      });
    } else {
      checks.push({
        description: `Price impact is ${percentFormatter.format(Number(swapQuote.priceImpactPct))}.`,
        isEnabled: true,
      });
    }
  }

  if ((repayBankInfo && isBankOracleStale(repayBankInfo)) || (targetBankInfo && isBankOracleStale(targetBankInfo))) {
    checks.push({
      description: "Looping may fail due to network congestion preventing oracles from updating price data.",
      isEnabled: true,
      link: "https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean",
      linkText: "Learn more about marginfi's decentralized oracles.",
    });
  }

  return checks;
}

function canBeBorrowed(
  targetBankInfo: ExtendedBankInfo,
  extendedBankInfos: ExtendedBankInfo[],
  marginfiAccount: MarginfiAccountWrapper | null
): ActionMethod[] {
  let checks: ActionMethod[] = [];
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  if (isPaused) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    });
  }

  const isReduceOnly = targetBankInfo.info.rawBank.config.operationalState === OperationalState.ReduceOnly;
  if (isReduceOnly) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is in reduce-only mode. You may only withdraw a deposit or repay a loan.`,
      isEnabled: false,
    });
  }

  const isBeingRetired =
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Initial, targetBankInfo.info.oraclePrice, true)
      .eq(0) &&
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Maintenance, targetBankInfo.info.oraclePrice)
      .gt(0);
  if (isBeingRetired) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is being retired. You may only withdraw a deposit or repay a loan.`,
      isEnabled: false,
    });
  }

  const isFull = targetBankInfo.info.rawBank.computeRemainingCapacity().borrowCapacity.lte(0);
  if (isFull) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is at borrow capacity.`,
      isEnabled: false,
    });
  }

  const alreadyLending = targetBankInfo.isActive && targetBankInfo.position.isLending;
  if (alreadyLending) {
    checks.push({
      description: "You are already lending this asset, you need to close that position first to start borrowing.",
      isEnabled: false,
    });
  }

  const freeCollateral = marginfiAccount && marginfiAccount.computeFreeCollateral();
  if (!freeCollateral || (freeCollateral && freeCollateral.eq(0))) {
    checks.push({
      description: "You don't have any available collateral.",
      isEnabled: false,
    });
  }

  const existingLiabilityBanks = extendedBankInfos.filter(
    (b) => b.isActive && !b.position.isLending
  ) as ActiveBankInfo[];
  const existingIsolatedBorrow = existingLiabilityBanks.find(
    (b) => b.info.rawBank.config.riskTier === RiskTier.Isolated && !b.address.equals(targetBankInfo.address)
  );
  if (existingIsolatedBorrow) {
    checks.push({
      description: `You have an active isolated borrow (${existingIsolatedBorrow.meta.tokenSymbol}). You cannot borrow another asset while you do.`,
      isEnabled: false,
    });
  }

  const attemptingToBorrowIsolatedAssetWithActiveDebt =
    targetBankInfo.info.rawBank.config.riskTier === RiskTier.Isolated &&
    !marginfiAccount
      ?.computeHealthComponents(MarginRequirementType.Equity, [targetBankInfo.address])
      .liabilities.isZero();
  if (attemptingToBorrowIsolatedAssetWithActiveDebt) {
    checks.push({
      description: "You cannot borrow an isolated asset with existing borrows.",
      isEnabled: false,
    });
  }

  if (targetBankInfo && isBankOracleStale(targetBankInfo)) {
    checks.push({
      description:
        "Borrows from this bank may fail due to network congestion preventing oracles from updating price data.",
      isEnabled: true,
      link: "https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean",
      linkText: "Learn more about marginfi's decentralized oracles.",
    });
  }

  return checks;
}

function canBeLent(targetBankInfo: ExtendedBankInfo, nativeSolBalance: number): ActionMethod[] {
  let checks: ActionMethod[] = [];
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;

  if (isPaused) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    });
  }

  const isReduceOnly = targetBankInfo.info.rawBank.config.operationalState === OperationalState.ReduceOnly;
  if (isReduceOnly) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is in reduce-only mode. You may only withdraw a deposit or repay a loan.`,
      isEnabled: false,
    });
  }

  const isBeingRetired =
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Initial, targetBankInfo.info.oraclePrice, true)
      .eq(0) &&
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Maintenance, targetBankInfo.info.oraclePrice)
      .gt(0);
  if (isBeingRetired) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is being retired. You may only withdraw a deposit or repay a loan.`,
      isEnabled: false,
    });
  }

  const alreadyBorrowing = targetBankInfo.isActive && !targetBankInfo.position.isLending;
  if (alreadyBorrowing) {
    checks.push({
      description: "You are already borrowing this asset, you need to repay that position first to start lending.",
      isEnabled: false,
    });
  }

  const isFull = targetBankInfo.info.rawBank.computeRemainingCapacity().depositCapacity.lte(0);
  if (isFull) {
    checks.push({
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is at deposit capacity.`,
      isEnabled: false,
    });
  }

  const isWrappedSol = targetBankInfo.info.state.mint.equals(WSOL_MINT);
  const walletBalance = floor(
    isWrappedSol
      ? Math.max(targetBankInfo.userInfo.tokenAccount.balance + nativeSolBalance - FEE_MARGIN, 0)
      : targetBankInfo.userInfo.tokenAccount.balance,
    targetBankInfo.info.state.mintDecimals
  );

  if (walletBalance === 0) {
    checks.push({ description: `Insufficient ${targetBankInfo.meta.tokenSymbol} in wallet.`, isEnabled: false });
  }

  return checks;
}

function canBeLstStaked(lstQuoteMeta: QuoteResponseMeta | null): ActionMethod[] {
  let checks: ActionMethod[] = [];

  if (lstQuoteMeta?.quoteResponse?.priceImpactPct && Number(lstQuoteMeta?.quoteResponse.priceImpactPct) > 0.01) {
    if (lstQuoteMeta?.quoteResponse?.priceImpactPct && Number(lstQuoteMeta?.quoteResponse.priceImpactPct) > 0.05) {
      checks.push({
        description: `Price impact is ${percentFormatter.format(Number(lstQuoteMeta?.quoteResponse.priceImpactPct))}.`,
        actionMethod: "ERROR",
        isEnabled: true,
      });
    } else {
      checks.push({
        description: `Price impact is ${percentFormatter.format(Number(lstQuoteMeta?.quoteResponse.priceImpactPct))}.`,
        isEnabled: true,
      });
    }
  }

  if (!lstQuoteMeta?.quoteResponse) {
    checks.push({ isEnabled: false });
  }

  return checks;
}

export async function getSwapQuoteWithRetry(quoteParams: QuoteGetRequest, maxRetries = 5, timeout = 1500) {
  const jupiterQuoteApi = createJupiterApiClient();
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const swapQuote = await jupiterQuoteApi.quoteGet(quoteParams);
      return swapQuote; // Success, return the result
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed`);
      attempt++;
      if (attempt === maxRetries) {
        throw new Error(`Failed to get to quote after ${maxRetries} attempts`);
      }
      await new Promise((resolve) => setTimeout(resolve, timeout));
    }
  }
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

export async function verifyJupTxSizeCollat(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo,
  depositBank: ExtendedBankInfo,
  amount: number,
  withdrawAmount: number,
  quoteResponse: QuoteResponse,
  connection: Connection
) {
  try {
    const builder = await repayWithCollatBuilder({
      marginfiAccount,
      bank,
      amount,
      options: {
        repayCollatQuote: quoteResponse,
        withdrawAmount,
        depositBank,
        connection,
        repayCollatTxn: null,
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

export const debounceFn = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

export const formatAmount = (
  newAmount: string,
  maxAmount: number,
  bank: ExtendedBankInfo | null,
  numberFormater: Intl.NumberFormat
) => {
  let formattedAmount: string, amount: number;
  // Remove commas from the formatted string
  const newAmountWithoutCommas = newAmount.replace(/,/g, "");
  let decimalPart = newAmountWithoutCommas.split(".")[1];
  const mintDecimals = bank?.info.state.mintDecimals ?? 9;

  if (
    (newAmount.endsWith(",") || newAmount.endsWith(".")) &&
    !newAmount.substring(0, newAmount.length - 1).includes(".")
  ) {
    amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
    formattedAmount = numberFormater.format(amount).concat(".");
  } else {
    const isDecimalPartInvalid = isNaN(Number.parseFloat(decimalPart));
    if (!isDecimalPartInvalid) decimalPart = decimalPart.substring(0, mintDecimals);
    decimalPart = isDecimalPartInvalid
      ? ""
      : ".".concat(Number.parseFloat("1".concat(decimalPart)).toString().substring(1));
    amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
    formattedAmount = numberFormater.format(amount).split(".")[0].concat(decimalPart);
  }

  if (amount > maxAmount) {
    return numberFormater.format(maxAmount);
  } else {
    return formattedAmount;
  }
};
