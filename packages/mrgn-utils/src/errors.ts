import { JUPITER_PROGRAM_V6_ID } from "@jup-ag/react-hook";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { percentFormatter } from "@mrgnlabs/mrgn-common";
import { ActionMethod } from "./actions";

// Static errors that are not expected to change
export const STATIC_SIMULATION_ERRORS: { [key: string]: ActionMethod } = {
  NOT_INITIALIZED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Marginfi client or account not initialized. Please refresh and try again.",
  },
  SLIPPAGE: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Slippage tolerance exceeded. Please increase the slippage tolerance in the settings and try again.",
  },
  TX_SIZE: {
    isEnabled: false,
    actionMethod: "WARNING",
    description:
      "The Jupiter routes for this swap cause the transaction to fail due to size restrictions. Please try again or pick another token.",
  },
  FL_FAILED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Failed to fetch data. Please choose a different collateral option or refresh the page.",
  },
  CLOSE_POSITIONS_FL_FAILED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Failed to close position. Please try again or manually reduce your position size.",
  },
  KEY_SIZE: {
    isEnabled: false,
    actionMethod: "WARNING",
    description:
      "This transaction fails due to account restrictions. Please decrease the positions on mrgnlend and try again.",
  },
  STALE_TRADING: {
    isEnabled: true,
    actionMethod: "WARNING",
    description: "Trading may fail due to network congestion preventing oracles from updating price data.",
    link: "https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean",
    linkText: "Learn more about marginfi's decentralized oracles.",
  },
  STALE_TRADING_OR_HEALTH: {
    isEnabled: true,
    actionMethod: "WARNING",
    description:
      "Trading may fail due to poor account health or network congestion preventing oracles from updating price data.",
    link: "https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean",
    linkText: "Learn more about marginfi's decentralized oracles.",
  },
  USER_REJECTED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "User rejected the transaction.",
  },
  DEPOSIT_CAP_EXCEEDED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "The maximum deposit capacity for this asset has been reached.",
  },
  UTILIZATION_RATIO_INVALID: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Insufficient liquidity for this trade.",
  },
  NO_POSITIONS: {
    description: "No position found.",
    isEnabled: false,
  },
  HEALTH_LIQUIDATION_FAILED: {
    isEnabled: true,
    actionMethod: "WARNING",
    description: "Simulating transaction failed. Please try again.",
  },
  NO_COLLATERAL: {
    description: "No available collateral.",
    isEnabled: false,
  },
  ALREADY_LENDING: {
    description: "You're already lending this asset, you need to close that position first to start borrowing.",
    isEnabled: false,
  },
  ALREADY_BORROWING: {
    description: "You are already borrowing this asset, you need to repay that position first to start lending.",
    isEnabled: false,
  },
  EXISTING_BORROW: {
    description: "You cannot borrow an isolated asset with existing borrows.",
    isEnabled: false,
  },
  TRANSACTION_EXPIRED: {
    description:
      "Transaction failed to land due to network congestion. This is a known issue that marginfi is actively working with Solana Labs to address. Please try again in a few moments.",
    isEnabled: true,
    actionMethod: "WARNING",
  },
  INSUFICIENT_LAMPORTS: {
    description: "You do not have enough SOL to execute the transaction",
    isEnabled: true,
    actionMethod: "WARNING",
  },
  INSUFICIENT_FUNDS: {
    description: "You do not have enough funds to execute the transaction",
    isEnabled: true,
    actionMethod: "WARNING",
  },
  INSUFICIENT_FUNDS_REPAY: {
    description:
      "Insufficient funds for the transaction, likely due to a bad Jupiter quote. Please select another amount and try again.",
    isEnabled: true,
    actionMethod: "WARNING",
  },
};

const createRepayCollatFailedCheck = (tokenSymbol?: string): ActionMethod => ({
  description: `Unable to repay using ${tokenSymbol}, please select another collateral.`,
  isEnabled: false,
});

const createInsufficientBalanceCheck = (tokenSymbol?: string): ActionMethod => ({
  description: `Insufficient ${tokenSymbol} in wallet.`,
  isEnabled: false,
});

const createExistingIsolatedBorrowCheck = (tokenSymbol?: string): ActionMethod => ({
  description: `You have an active isolated borrow (${tokenSymbol}). You cannot borrow another asset while you do.`,
  isEnabled: false,
});

const createBorrowCapacityCheck = (tokenSymbol?: string): ActionMethod => ({
  description: `The ${tokenSymbol} bank is at borrow capacity.`,
  isEnabled: false,
});

const createBankRetiredCheck = (tokenSymbol?: string): ActionMethod => ({
  description: `The ${tokenSymbol}  bank is being retired. You may only withdraw a deposit or repay a loan.`,
  isEnabled: false,
});

const createReduceOnlyCheck = (tokenSymbol?: string): ActionMethod => ({
  description: `The ${tokenSymbol} bank is in reduce-only mode. You may only withdraw a deposit or repay a loan.`,
  isEnabled: false,
});

const createWalletRapayCheck = (tokenSymbol?: string): ActionMethod => ({
  description: `You have ${tokenSymbol} in your wallet and can repay without using collateral.`,
  isEnabled: true,
  actionMethod: "INFO",
});

const createSufficientLiqCheck = (tokenSymbol?: string): ActionMethod => ({
  description: `Insufficient ${tokenSymbol} in wallet for loan repayment.`,
  isEnabled: false,
});

const createIfBorrowingCheck = (tokenSymbol?: string): ActionMethod => ({
  description: `You&apos;re not borrowing ${tokenSymbol}.`,
  isEnabled: false,
});

const createIfLendingCheck = (tokenSymbol?: string): ActionMethod => ({
  description: `You&apos;re not lending ${tokenSymbol}.`,
  isEnabled: false,
});

const createBankPausedCheck = (tokenSymbol?: string): ActionMethod => ({
  description: `The ${tokenSymbol} bank is paused at this time.`,
  isEnabled: false,
});

const createStaleCheck = (action: string): ActionMethod => ({
  isEnabled: true,
  actionMethod: "WARNING",
  description: `${action} from this bank may fail due to network congestion preventing oracles from updating price data.`,
  link: "https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean",
  linkText: "Learn more about marginfi's decentralized oracles.",
});

const createWithdrawCheck = (
  tradeSide: string,
  stableBank: ExtendedBankInfo,
  tokenBank: ExtendedBankInfo
): ActionMethod => ({
  isEnabled: false,
  description: `Before you can ${tradeSide} this asset, you'll need to withdraw your supplied ${
    tradeSide === "long" ? stableBank.meta.tokenSymbol : tokenBank.meta.tokenSymbol
  }.`,
  action: {
    type: ActionType.Withdraw,
    bank: tradeSide === "long" ? stableBank : tokenBank,
  },
});

const createRepayCheck = (
  tradeSide: string,
  stableBank: ExtendedBankInfo,
  tokenBank: ExtendedBankInfo
): ActionMethod => ({
  isEnabled: false,
  description: `Before you can ${tradeSide} this asset, you'll need to repay your borrowed ${
    tradeSide === "long" ? tokenBank : stableBank
  }.`,
  action: {
    type: ActionType.Repay,
    bank: tradeSide === "long" ? tokenBank : stableBank,
  },
});

const createLoopCheck = (
  tradeSide: string,
  stableBank: ExtendedBankInfo,
  tokenBank: ExtendedBankInfo
): ActionMethod => ({
  isEnabled: false,
  description: `You are already ${tradeSide} this asset, you need to close that position before you can go ${
    tradeSide === "long" ? "short" : "long"
  }.`,
  action: {
    type: ActionType.Repay,
    bank: tradeSide === "long" ? tokenBank : stableBank,
  },
});

const createPriceImpactErrorCheck = (priceImpactPct: number): ActionMethod => {
  return {
    description: `Price impact is ${percentFormatter.format(priceImpactPct)}.`,
    actionMethod: "ERROR",
    isEnabled: true,
  };
};

const createPriceImpactWarningCheck = (priceImpactPct: number): ActionMethod => {
  return {
    description: `Price impact is ${percentFormatter.format(Number(priceImpactPct))}.`,
    isEnabled: true,
  };
};

const checkErrorCodeMatch = (errorMessage: string, errorCode: number): boolean => {
  const hex = "0x" + errorCode.toString(16).padStart(4, "0");
  return errorMessage.includes(hex) || errorMessage.includes(errorCode.toString());
};

export const DYNAMIC_SIMULATION_ERRORS = {
  WITHDRAW_CHECK: createWithdrawCheck,
  REPAY_CHECK: createRepayCheck,
  LOOP_CHECK: createLoopCheck,
  PRICE_IMPACT_ERROR_CHECK: createPriceImpactErrorCheck,
  PRICE_IMPACT_WARNING_CHECK: createPriceImpactWarningCheck,
  STALE_CHECK: createStaleCheck,
  BANK_PAUSED_CHECK: createBankPausedCheck,
  IF_LENDING_CHECK: createIfLendingCheck,
  IF_BORROWING_CHECK: createIfBorrowingCheck,
  SUFFICIENT_LIQ_CHECK: createSufficientLiqCheck,
  WALLET_REPAY_CHECK: createWalletRapayCheck,
  REDUCE_ONLY_CHECK: createReduceOnlyCheck,
  BANK_RETIRED_CHECK: createBankRetiredCheck,
  BORROW_CAPACITY_CHECK: createBorrowCapacityCheck,
  EXISTING_ISO_BORROW_CHECK: createExistingIsolatedBorrowCheck,
  INSUFFICIENT_BALANCE_CHECK: createInsufficientBalanceCheck,
  REPAY_COLLAT_FAILED_CHECK: createRepayCollatFailedCheck,
};

const createCustomError = (description: string): ActionMethod => ({
  isEnabled: true,
  actionMethod: "WARNING",
  description,
});

export const handleError = (
  error: any,
  bank: ExtendedBankInfo | null,
  isArena: boolean = false,
  action?: string
): ActionMethod | null => {
  try {
    // JUPITER ERRORS
    if (error?.programId === JUPITER_PROGRAM_V6_ID.toBase58()) {
      if (error?.message.includes("Slippage tolerance exceeded")) {
        return STATIC_SIMULATION_ERRORS.SLIPPAGE;
      } else {
        return createCustomError(error.message);
      }
    }

    // CATCH SPECIFIC ERRORS
    if (error?.message) {
      if (error.message.includes("RangeError") || error.message.toLowerCase().includes("too large")) {
        return STATIC_SIMULATION_ERRORS.TX_SIZE;
      }

      if (
        error.message?.toLowerCase()?.includes("stale") ||
        checkErrorCodeMatch(error.message, 6017) ||
        error.message?.toLowerCase()?.includes("stale") ||
        error?.logs?.some((entry: string) => entry.includes("stale"))
      ) {
        if (isArena) {
          return STATIC_SIMULATION_ERRORS.STALE_TRADING;
        } else {
          return DYNAMIC_SIMULATION_ERRORS.STALE_CHECK(action ?? "The action");
        }
      }

      if (
        error.messgae?.toLowerCase()?.includes("block height exceeded") ||
        error.message === "BlockhashNotFound" || // Exact match
        error.message?.toLowerCase()?.includes("blockhashnotfound") || // Contains 'BlockhashNotFound'
        error.message?.includes('"BlockhashNotFound"') || // Contains '"BlockhashNotFound"'
        error.message?.toLowerCase()?.includes("blockhash not found") || // Contains 'Blockhash not found'
        error?.logs?.some((entry: string) => entry.toLowerCase().includes("blockhash not found"))
      ) {
        return STATIC_SIMULATION_ERRORS.TRANSACTION_EXPIRED;
      }

      if (error.message?.toLowerCase()?.includes("user rejected")) {
        return STATIC_SIMULATION_ERRORS.USER_REJECTED;
      }

      if (error.message?.toLowerCase().includes("insufficient funds")) {
        if (action === "Repaying") {
          return STATIC_SIMULATION_ERRORS.INSUFICIENT_FUNDS_REPAY;
        } else {
          return STATIC_SIMULATION_ERRORS.INSUFICIENT_FUNDS;
        }
      }

      if (
        error.message?.toLowerCase().includes("insufficient lamport") ||
        error?.logs?.some((entry: string[]) => entry.includes("insufficient lamport"))
      ) {
        return STATIC_SIMULATION_ERRORS.INSUFICIENT_LAMPORTS;
      }

      if (
        checkErrorCodeMatch(error.message, 6029) ||
        error.message?.toLowerCase().includes("deposit capacity exceeded")
      ) {
        return STATIC_SIMULATION_ERRORS.DEPOSIT_CAP_EXCEEDED;
      }

      if (checkErrorCodeMatch(error.message, 6029) || error.message?.toLowerCase().includes("borrow cap exceeded")) {
        return STATIC_SIMULATION_ERRORS.BORROW_CAP_EXCEEDED;
      }

      if (
        checkErrorCodeMatch(error.message, 6010) ||
        error.message?.toLowerCase().includes("bad health or stale oracle")
      ) {
        return STATIC_SIMULATION_ERRORS.STALE_TRADING_OR_HEALTH;
      }

      if (
        isArena &&
        (checkErrorCodeMatch(error.message, 6028) || error.message?.toLowerCase().includes("utilization ratio"))
      ) {
        return STATIC_SIMULATION_ERRORS.UTILIZATION_RATIO_INVALID;
      }
    }

    // CATCH REMAINING MARGINFI PROGRAM ERROS
    if (error?.programId === "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA") {
      return createCustomError(error.message);
    }

    return null;
  } catch (err) {
    console.log({ error: err });
    return null;
  }
};

export const handleTransactionError = (
  error: any,
  bank: ExtendedBankInfo | null,
  isArena: boolean = false
): ActionMethod | undefined => {
  try {
    const action = handleError(error, bank, isArena);
    if (action) {
      return action;
    }
    console.log({ error: error });
    return STATIC_SIMULATION_ERRORS.HEALTH_LIQUIDATION_FAILED;
  } catch (err) {
    console.log({ error: err });
  }
};

export const handleSimulationError = (
  error: any,
  bank: ExtendedBankInfo | null,
  isArena: boolean = false,
  actionString?: string
): ActionMethod | undefined => {
  try {
    const action = handleError(error, bank, isArena, actionString);
    if (action) {
      return action;
    }
    console.log({ error: error });
    return STATIC_SIMULATION_ERRORS.HEALTH_LIQUIDATION_FAILED;
  } catch (err) {
    console.log({ error: err });
  }
};
