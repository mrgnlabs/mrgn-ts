import { JUPITER_PROGRAM_V6_ID } from "@jup-ag/react-hook";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { percentFormatter } from "@mrgnlabs/mrgn-common";
import { ActionMethod } from "./actions";

// Static errors that are not expected to change
export const STATIC_SIMULATION_ERRORS: { [key: string]: ActionMethod } = {
  SLIPPAGE: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Slippage tolerance exceeded. Please increase the slippage tolerance in the settings and try again.",
  },
  TX_SIZE: {
    isEnabled: false,
    actionMethod: "WARNING",
    description:
      "This swap causes the transaction to fail due to size restrictions. Please try again or pick another token.",
  },
  STALE_TRADING: {
    isEnabled: true,
    actionMethod: "WARNING",
    description: "Trading may fail due to network congestion preventing oracles from updating price data.",
    link: "https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean",
    linkText: "Learn more about marginfi's decentralized oracles.",
  },
  BORROW_CAP_EXCEEDED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Borrow cap is exceeded.",
  },
  UTILIZATION_RATIO_INVALID: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Insufficient liquidity available to complete this action.",
    link: "/",
    linkText: "View the pool to generate more deposits.",
  },
  NO_POSITIONS: {
    description: "No position found.",
    isEnabled: false,
  },
  HEALTH_LIQUIDATION_FAILED: {
    isEnabled: true,
    actionMethod: "WARNING",
    description: "Simulating health/liquidation impact failed.",
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
    description: "The transaction has expired. Please try again.",
    isEnabled: true,
    actionMethod: "WARNING",
  },
  INSUFICIENT_LAMPORTS: {
    description: "You do not have enough SOL to execute the transaction",
    isEnabled: true,
    actionMethod: "WARNING",
  },
};

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
  isEnabled: true,
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
  description: `You are already ${
    tradeSide === "long" ? "shorting" : "longing"
  } this asset, you need to close that position first to start ${tradeSide === "long" ? "longing" : "shorting"}.`,
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
};

const createCustomError = (description: string): ActionMethod => ({
  isEnabled: true,
  actionMethod: "WARNING",
  description,
});

export const handleSimulationError = (
  error: any,
  bank: ExtendedBankInfo | null,
  isArena: boolean = false
): ActionMethod | undefined => {
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
      if (error.message.includes("RangeError") || error.message.includes("too large")) {
        return STATIC_SIMULATION_ERRORS.TX_SIZE;
      }

      if (error.message.includes("6017") || error.message.includes("stale")) {
        return STATIC_SIMULATION_ERRORS.STALE;
      }

      if (error.message.includes("Blockhash not found")) {
        return STATIC_SIMULATION_ERRORS.TRANSACTION_EXPIRED;
      }

      if (error.message.includes("insufficient lamport")) {
        return STATIC_SIMULATION_ERRORS.INSUFICIENT_LAMPORTS;
      }

      if (error.message.includes("6029") || error.message.includes("borrow cap exceeded")) {
        return STATIC_SIMULATION_ERRORS.BORROW_CAP_EXCEEDED;
      }

      if (isArena && (error.message.includes("6028") || error.message.includes("utilization ratio"))) {
        if (bank) {
          const method = {
            ...STATIC_SIMULATION_ERRORS.UTILIZATION_RATIO_INVALID,
            link: `/pools/${bank.address.toBase58()}`,
            linkText: `View the ${bank.meta.tokenSymbol} pool to generate more deposits.`,
          };
          return method;
        } else {
          return STATIC_SIMULATION_ERRORS.UTILIZATION_RATIO_INVALID;
        }
      }
    }

    // CATCH REMAINING MARGINFI PROGRAM ERROS
    if (error?.programId === "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA") {
      console.log({ error: error });
      return createCustomError(error.message);
    }
    console.log({ error: error });
    return STATIC_SIMULATION_ERRORS.HEALTH_LIQUIDATION_FAILED;
  } catch (err) {
    console.log({ error: err });
  }
};
