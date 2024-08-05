import {
  canBeBorrowed,
  canBeLent,
  canBeLooped,
  canBeLstStaked,
  canBeRepaid,
  canBeRepaidCollat,
  canBeWithdrawn,
} from "@mrgnlabs/mrgn-utils";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import { createJupiterApiClient, QuoteGetRequest, QuoteResponse } from "@jup-ag/api";
import { AddressLookupTableAccount, Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

import { StakeData, loopingBuilder, repayWithCollatBuilder } from "~/utils";
import { STATIC_SIMULATION_ERRORS } from "@mrgnlabs/mrgn-utils";
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
        const lstStakeChecks = canBeLstStaked(lstQuoteMeta as any);
        if (lstStakeChecks) checks.push(...lstStakeChecks);
        break;
      case ActionType.UnstakeLST:
        const lstUnstakeChecks = canBeLstStaked(lstQuoteMeta as any);
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
  connection: Connection,
  isTxnSplit: boolean = false,
  priorityFee: number
): Promise<{
  flashloanTx: VersionedTransaction | null;
  bundleTipTxn: VersionedTransaction | null;
  addressLookupTableAccounts: AddressLookupTableAccount[];
  error?: ActionMethod;
}> {
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
        bundleTipTxn: null,
      },
      isTxnSplit,
      priorityFee,
    });

    const txCheck = checkTxSize(builder);
    if (!txCheck) throw Error("this should not happen");

    return txCheck;
  } catch (error) {
    console.error(error);
    return {
      flashloanTx: null,
      bundleTipTxn: null,
      addressLookupTableAccounts: [],
      error: STATIC_SIMULATION_ERRORS.TX_SIZE,
    };
  }
}

export async function verifyJupTxSizeCollat(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo,
  depositBank: ExtendedBankInfo,
  amount: number,
  withdrawAmount: number,
  quoteResponse: QuoteResponse,
  connection: Connection,
  priorityFee: number,
  isTxnSplit: boolean = false
): Promise<{
  flashloanTx: VersionedTransaction | null;
  bundleTipTxn: VersionedTransaction | null;
  addressLookupTableAccounts: AddressLookupTableAccount[];
  error?: ActionMethod;
}> {
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
        bundleTipTxn: null,
      },
      priorityFee,
      isTxnSplit,
    });

    const txCheck = checkTxSize(builder);
    if (!txCheck) throw Error("this should not happen");

    return txCheck;
  } catch (error) {
    console.error(error);
    return {
      flashloanTx: null,
      bundleTipTxn: null,
      addressLookupTableAccounts: [],
      error: STATIC_SIMULATION_ERRORS.TX_SIZE,
    };
  }
}

const checkTxSize = (builder: {
  flashloanTx: VersionedTransaction;
  bundleTipTxn: VersionedTransaction | null;
  addressLookupTableAccounts: AddressLookupTableAccount[];
}) => {
  try {
    const totalSize = builder.flashloanTx.message.serialize().length;
    const totalKeys = builder.flashloanTx.message.getAccountKeys({
      addressLookupTableAccounts: builder.addressLookupTableAccounts,
    }).length;
    if (totalSize > 1232 - 110 || totalKeys >= 64) {
      // signature is roughly 110 bytes
      if (totalKeys >= 64) {
        return {
          flashloanTx: null,
          bundleTipTxn: null,
          addressLookupTableAccounts: builder.addressLookupTableAccounts,
          error: STATIC_SIMULATION_ERRORS.KEY_SIZE,
        };
      } else if (totalSize > 1232 - 110) {
        return {
          flashloanTx: null,
          bundleTipTxn: null,
          addressLookupTableAccounts: builder.addressLookupTableAccounts,
          error: STATIC_SIMULATION_ERRORS.TX_SIZE,
        };
      }
    } else {
      return {
        flashloanTx: builder.flashloanTx,
        bundleTipTxn: builder.bundleTipTxn,
        addressLookupTableAccounts: builder.addressLookupTableAccounts,
        error: undefined,
      };
    }
  } catch (error) {
    return {
      flashloanTx: null,
      bundleTipTxn: null,
      addressLookupTableAccounts: builder.addressLookupTableAccounts,
      error: STATIC_SIMULATION_ERRORS.TX_SIZE,
    };
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
