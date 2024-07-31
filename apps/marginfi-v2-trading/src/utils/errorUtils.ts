import { JUPITER_PROGRAM_V6_ID } from "@jup-ag/react-hook";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { ActionMethod } from "./actionBoxUtils";
import { ActiveGroup } from "~/store/tradeStore";
import { percentFormatter } from "@mrgnlabs/mrgn-common";

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
  STALE: {
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
  HEALTH_LIQUIDATION_FAILED: {
    isEnabled: true,
    actionMethod: "WARNING",
    description: "Simulating health/liquidation impact failed.",
  },
};

const createWithdrawCheck = (tradeSide: string, activeGroup: ActiveGroup): ActionMethod => ({
  isEnabled: true,
  description: `Before you can ${tradeSide} this asset, you'll need to withdraw your supplied ${
    tradeSide === "long" ? activeGroup.usdc.meta.tokenSymbol : activeGroup.token.meta.tokenSymbol
  }. Learn more here.`,
  action: {
    type: ActionType.Withdraw,
    bank: tradeSide === "long" ? activeGroup.usdc : activeGroup.token,
  },
});

const createRepayCheck = (tradeSide: string, activeGroup: ActiveGroup): ActionMethod => ({
  isEnabled: false,
  description: `Before you can ${tradeSide} this asset, you'll need to repay your borrowed ${
    tradeSide === "long" ? activeGroup.token.meta.tokenSymbol : activeGroup.usdc.meta.tokenSymbol
  }.`,
  action: {
    type: ActionType.Repay,
    bank: tradeSide === "long" ? activeGroup.token : activeGroup.usdc,
  },
});

const createLoopCheck = (tradeSide: string, activeGroup: ActiveGroup): ActionMethod => ({
  isEnabled: false,
  description: `You are already ${
    tradeSide === "long" ? "shorting" : "longing"
  } this asset, you need to close that position first to start ${tradeSide === "long" ? "longing" : "shorting"}.`,
  action: {
    type: ActionType.Repay,
    bank: tradeSide === "long" ? activeGroup.token : activeGroup.usdc,
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
};

const createCustomError = (description: string): ActionMethod => ({
  isEnabled: true,
  actionMethod: "WARNING",
  description,
});

export const handleSimulationError = (error: any, bank: ExtendedBankInfo | null) => {
  try {
    console.log({ error });
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

      if (error.message.includes("6029") || error.message.includes("borrow cap exceeded")) {
        return STATIC_SIMULATION_ERRORS.BORROW_CAP_EXCEEDED;
      }

      if (error.message.includes("6028") || error.message.includes("utilization ratio")) {
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
      return createCustomError(error.message);
    }

    return STATIC_SIMULATION_ERRORS.HEALTH_LIQUIDATION_FAILED;
  } catch (err) {
    console.log({ error: err });
  }
};
