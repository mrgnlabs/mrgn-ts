import { JUPITER_PROGRAM_V6_ID } from "@jup-ag/react-hook";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { ActionMethod } from "./actionBoxUtils";

// Static errors that are not expected to change
const SIMULATION_ERRORS: { [key: string]: ActionMethod } = {
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
    link: "https://forum.marginfi.community/t/work-were-doing-to-improve-collateral-repay/333",
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
        return SIMULATION_ERRORS.SLIPPAGE;
      } else {
        return createCustomError(error.message);
      }
    }

    // CATCH SPECIFIC ERRORS
    if (error?.message) {
      if (error.message.includes("RangeError") || error.message.includes("too large")) {
        return SIMULATION_ERRORS.TX_SIZE;
      }

      if (error.message.includes("6017") || error.message.includes("stale")) {
        return SIMULATION_ERRORS.STALE;
      }

      if (error.message.includes("6029") || error.message.includes("borrow cap exceeded")) {
        return SIMULATION_ERRORS.BORROW_CAP_EXCEEDED;
      }

      if (error.message.includes("6028") || error.message.includes("utilization ratio")) {
        if (bank) {
          const method = {
            ...SIMULATION_ERRORS.UTILIZATION_RATIO_INVALID,
            link: `/pools/${bank.address.toBase58()}`,
            linkText: `View the ${bank.meta.tokenSymbol} pool to generate more deposits.`,
          };
          return method;
        } else {
          return SIMULATION_ERRORS.UTILIZATION_RATIO_INVALID;
        }
      }
    }

    // CATCH REMAINING MARGINFI PROGRAM ERROS
    if (error?.programId === "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA") {
      return createCustomError(error.message);
    }

    return SIMULATION_ERRORS.HEALTH_LIQUIDATION_FAILED;
  } catch (err) {
    console.log({ error: err });
  }
};
