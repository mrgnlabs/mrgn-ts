import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { percentFormatter } from "@mrgnlabs/mrgn-common";
import { ActionMessageType } from "./actions";
import { MAX_SLIPPAGE_PERCENTAGE } from "./slippage.consts";
import { JUPITER_PROGRAM_V6_ID } from "@jup-ag/common";

// Static info messages
export const STATIC_INFO_MESSAGES: { [key: string]: ActionMessageType } = {
  EMODE_EXTEND_IMPACT: {
    isEnabled: true,
    actionMethod: "INFO",
    actionSubType: "EMODE",
    description: "This action will keep e-mode active on your account.",
    code: 1001,
  },
  EMODE_ACTIVATE_IMPACT: {
    isEnabled: true,
    actionMethod: "INFO",
    actionSubType: "EMODE",
    description: "This action will activate e-mode on your account.",
    code: 1002,
  },
};

// Static errors that are not expected to change
export const STATIC_SIMULATION_ERRORS: { [key: string]: ActionMessageType } = {
  NOT_INITIALIZED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "There was an issue with the marginfi client. Please refresh and try again.",
    code: 101,
  },
  SLIPPAGE: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Max slippage was exceeeded, please increase your max slippage in settings and try again.",
    retry: true,
    code: 102,
  },
  TX_SIZE: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Unable to find a Jupiter quote for this pairing, please try again.",
    retry: true,
    code: 103,
  },
  FL_FAILED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Unable to find a Jupiter quote for this pairing, please try again.",
    retry: true,
    code: 104,
  },
  CLOSE_POSITIONS_FL_FAILED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Failed to close position. Please try again or manually reduce your position size.",
    retry: true,
    code: 105,
  },
  KEY_SIZE: {
    isEnabled: false,
    actionMethod: "WARNING",
    description:
      "You have too many open positions for this transaction to complete. Please move positions to sub accounts from your portfolio and try again.",
    code: 106,
  },
  STALE_TRADING: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Some oracles were found to be stale causing inacurate prices. Please try again.",
    link: "https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean",
    linkText: "Learn more about marginfi's decentralized oracles.",
    code: 107,
    retry: true,
  },
  STALE_TRADING_OR_HEALTH: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Transaction failed due to poor account health, please increase your collateral and try again.",
    code: 108,
  }, // We should add an action to deposit collateral here, this is quite often being thrown in the arena
  USER_REJECTED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Transaction was cancelled.",
    retry: true,
    code: 109,
  },
  DEPOSIT_CAP_EXCEEDED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "The maximum deposit capacity for this asset has been reached.",
    code: 110,
  },
  UTILIZATION_RATIO_INVALID: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "There is insufficient liquidity in the pool to complete this trade.",
    code: 111,
  },
  NO_POSITIONS: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "This position could not be found. Please refresh and try again.",
    code: 112,
  },
  SIMULATION_FAILED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Simulating transaction failed. Please try again.",
    retry: true,
    code: 113,
  },
  NO_COLLATERAL: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Insufficient collateral, you need to deposit funds first before you can borrow.",
    code: 114,
  },
  ALREADY_LENDING: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "You cannot borrow an asset you are already lending. Please withdraw first to start borrowing.",
    code: 115,
  },
  ALREADY_BORROWING: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "You cannot lend an asset you are already borrowing. Please repay first to start lending.",
    code: 116,
  },
  EXISTING_BORROW: {
    isEnabled: false,
    actionMethod: "WARNING",
    description:
      "Borrows of isolated assets can not be combined with other borrows. Please create a new sub account to take out this borrow.",
    code: 117,
  },
  TRANSACTION_EXPIRED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Transaction expired, please try again.",
    retry: true,
    code: 118,
  },
  INSUFICIENT_LAMPORTS: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "You do not have enough SOL to execute the transaction",
    code: 119,
  },
  INSUFICIENT_FUNDS: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "You do not have available funds to execute this transaction.",
    code: 120,
  },
  INSUFICIENT_FUNDS_REPAY: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Insufficient funds for this quote. Please try again.",
    retry: true,
    code: 121,
  },
  BUILDING_LENDING_TX: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Transaction failed to build, please open a ticket.",
    retry: true,
    code: 122,
  },
  STAKE_SIMULATION_FAILED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Transaction failed to build. Please try again",
    retry: true,
    code: 123,
  },
  STAKE_SWAP_SIMULATION_FAILED: {
    description: "Unable to find a Jupiter quote for this pairing, please try again.",
    isEnabled: false,
    actionMethod: "WARNING",
    code: 124,
  },
  ILLEGAL_ACCOUNT_AUTHORITY_TRANSFER: {
    description: "Account is not authorized for migration",
    isEnabled: false,
    actionMethod: "ERROR",
    code: 125,
  },
  TRADE_FAILED: {
    description: `Unable to execute trade, please try again.`,
    actionMethod: "WARNING",
    isEnabled: false,
    code: 142,
  },
  SLIPPAGE_TOO_HIGH: {
    description: `Slippage tolerance exceeded ${MAX_SLIPPAGE_PERCENTAGE}%.`,
    isEnabled: true,
    actionMethod: "WARNING",
    code: 130,
  },
  ACCOUNT_NOT_INITIALIZED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "There was an issue with the marginfi account. Please refresh and try again.",
    code: 131,
  },
  BANK_NOT_INITIALIZED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "There was an issue with the marginfi bank. Please refresh and try again.",
    code: 132,
  },
  MAX_AMOUNT_CALCULATION_FAILED: {
    description:
      "Maximum collateral couldn't be accurately calculated, but you can still enter an amount manually to proceed.",
    isEnabled: false,
    actionMethod: "WARNING",
    code: 133,
  },
  SIMULATION_NOT_READY: {
    isEnabled: false,
    actionMethod: "WARNING",
    description:
      "Transaction is not ready to execute yet. Please ensure it has been fully simulated before proceeding.",
    code: 134,
  },
  DEPOSIT_FAILED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Failed to deposit funds. Please try again.",
    retry: true,
    code: 135,
  },
  CREATE_SWAP_FAILED: {
    isEnabled: false,
    actionMethod: "WARNING",
    description: "Unable to find a Jupiter quote for this pairing, please try again.",
    retry: true,
    code: 136,
  },
  STAKED_ONLY_SOL_CHECK: {
    isEnabled: false,
    actionMethod: "WARNING",
    description:
      "Staked assets cannot be combined with other assets. Switch account or create a new account from your portfolio to deposit native stake.",
    retry: false,
    code: 136,
  },
  STAKED_ONLY_DEPOSIT_CHECK: {
    description: "Staked assets can not be borrowed at this time.",
    actionMethod: "WARNING",
    isEnabled: false,
    code: 137,
  },
  REPAY_COLLAT_FAILED: {
    description: "Unable to repay using collateral, please select another collateral.",
    actionMethod: "WARNING",
    isEnabled: false,
    code: 138,
  },
  NATIVE_STAKE_NOT_FOUND: {
    description: "Stake account or validator not found for this staked asset bank",
    isEnabled: false,
    actionMethod: "ERROR",
    code: 139,
  },
  TX_BUILD_FAILED: {
    description: "There was an unexpected error building the transaction, please contact support.",
    isEnabled: false,
    actionMethod: "WARNING",
    code: 144,
  },
  BANK_NOT_ACTIVE_CHECK: {
    description:
      "An internal configuration issue has occurred: Bank is not active. Please create a support ticket for assistance.",
    isEnabled: false,
    actionMethod: "ERROR",
    code: 145,
  },
  SLIPPAGE_INVALID_CHECK: {
    description:
      "The slippage is currently set to 0, which prevents the transaction from completing. Please increase the slippage or enable dynamic slippage mode to proceed.",
    isEnabled: false,
    actionMethod: "WARNING",
    code: 146,
  },
  JUP_QUOTE_FAILED: {
    description: "Unable to find a Jupiter quote for this pairing, please try again.",
    isEnabled: false,
    retry: true,
    actionMethod: "WARNING",
    code: 147,
  },
  ACTION_TYPE_CHECK: {
    description:
      "Action type is undefined or incorrect within the context of the function, this error indicates a bug in the code.",
    isEnabled: false,
    actionMethod: "ERROR",
    code: 148,
  },
  BANK_NOT_PROVIDED_CHECK: {
    description:
      "An internal configuration issue has occurred: Bank is not provided. Please create a support ticket for assistance.",
    isEnabled: false,
    actionMethod: "ERROR",
    code: 151,
  },
  CLOSE_POSITION_INVALID: {
    description:
      "An internal configuration issue has occurred: Close position config is invalid. Please create a support ticket for assistance.",
    isEnabled: false,
    actionMethod: "ERROR",
    code: 152,
  },
  ADD_POSITION_FAILED: {
    description: "Unable to add position, please try again.",
    actionMethod: "WARNING",
    isEnabled: false,
    code: 153,
  },
  STAKE_UNSTAKE_VALIDATOR_NOT_FOUND: {
    description: "Validator stake account not found, please try again.",
    actionMethod: "WARNING",
    isEnabled: false,
    code: 154,
  },
  REMOVE_E_MODE_CHECK: {
    description: "This action will disable e-mode on your account and reset boosted weights.",
    isEnabled: true,
    actionMethod: "WARNING",
    actionSubType: "EMODE",
    code: 157,
  },
};

const createEmodeReduceCheck = (): ActionMessageType => ({
  description: `This action will reduce your e-mode advantage.`,
  isEnabled: true,
  actionMethod: "INFO",
  actionSubType: "EMODE",
  code: 156,
});

const createEmodeIncreaseCheck = (): ActionMessageType => ({
  description: `This action will increase your e-mode advantage.`,
  isEnabled: true,
  actionMethod: "INFO",
  actionSubType: "EMODE",
  code: 155,
});

const createProcessingTxFailedCheck = (info?: string): ActionMessageType => ({
  description: `Error processing transaction. Please try again. ${info ? `Details: ${info}` : ""}`,
  isEnabled: false,
  actionMethod: "WARNING",
  code: 150,
});

const createSimulationFailedCheck = (info?: string): ActionMessageType => ({
  description: `Simulating transaction failed. Please try again. ${info ? `Details: ${info}` : ""}`,
  isEnabled: false,
  actionMethod: "WARNING",
  code: 149,
});

const createInsufficientStakeBalanceCheck = (tokenName?: string): ActionMessageType => ({
  description: `You need active native stake with the ${tokenName} validator to deposit to this bank`,
  isEnabled: false,
  actionMethod: "WARNING",
  code: 143,
});

const createTradeFailedCheck = (): ActionMessageType => ({
  description: `Unable to execute trade, please try again.`,
  isEnabled: false,
  actionMethod: "WARNING",
  code: 142,
});

const createRepayCollatFailedCheck = (tokenSymbol?: string): ActionMessageType => ({
  description: `Unable to repay using ${tokenSymbol}, please select another collateral.`,
  isEnabled: false,
  actionMethod: "WARNING",
  code: 141,
});

const createInsufficientBalanceCheck = (tokenSymbol?: string): ActionMessageType => ({
  description: `Insufficient ${tokenSymbol} in wallet.`,
  isEnabled: false,
  actionMethod: "WARNING",
  code: 140,
});

const createExistingIsolatedBorrowCheck = (tokenSymbol?: string): ActionMessageType => ({
  description: `You have an active isolated borrow (${tokenSymbol}) which cannot be combined with other borrows.`,
  isEnabled: false,
  actionMethod: "WARNING",
  code: 139,
});

const createBorrowCapacityCheck = (tokenSymbol?: string): ActionMessageType => ({
  description: `The ${tokenSymbol} bank is at borrow capacity!.`,
  isEnabled: false,
  code: 138,
});

const createBankRetiredCheck = (tokenSymbol?: string): ActionMessageType => ({
  description: `The ${tokenSymbol}  bank is being retired. You may only withdraw a deposit or repay a loan.`,
  isEnabled: false,
  actionMethod: "WARNING",
  code: 137,
});

const createReduceOnlyCheck = (tokenSymbol?: string): ActionMessageType => ({
  description: `The ${tokenSymbol} bank is in reduce-only mode. You may only withdraw a deposit or repay a loan.`,
  isEnabled: false,
  code: 136,
});

const createWalletRapayCheck = (tokenSymbol?: string): ActionMessageType => ({
  description: `You have ${tokenSymbol} in your wallet and can repay without using collateral.`,
  isEnabled: true,
  actionMethod: "INFO",
  code: 135,
});

const createSufficientLiqCheck = (tokenSymbol?: string, repayCollatAction: boolean = false): ActionMessageType => ({
  description: `Insufficient ${tokenSymbol} in wallet for loan repayment. ${
    repayCollatAction ? "Change the token to repay with collateral." : ""
  }`,
  isEnabled: false,
  actionMethod: "WARNING",
  code: 134,
});

const createIfBorrowingCheck = (tokenSymbol?: string): ActionMessageType => ({
  description: `You&apos;re not borrowing ${tokenSymbol}.`,
  isEnabled: false,
  actionMethod: "WARNING",
  code: 133,
});

const createIfLendingCheck = (tokenSymbol?: string): ActionMessageType => ({
  description: `You&apos;re not lending ${tokenSymbol}.`,
  isEnabled: false,
  actionMethod: "WARNING",
  code: 132,
});

const createBankPausedCheck = (tokenSymbol?: string): ActionMessageType => ({
  description: `The ${tokenSymbol} bank is paused at this time.`,
  isEnabled: false,
  actionMethod: "WARNING",
});

const createStaleCheck = (action: string): ActionMessageType => ({
  isEnabled: true,
  actionMethod: "WARNING",
  description: `${action} from this bank may fail due to network congestion preventing oracles from updating price data.`,
  link: "https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean",
  linkText: "Learn more about marginfi's decentralized oracles.",
});

const createStaleOrHealthCheck = (action: string): ActionMessageType => ({
  isEnabled: true,
  actionMethod: "WARNING",
  description: `${action} may fail due to stale price data or poor account health. Check oracle status and collateral before retrying.`,
  code: 108,
});

const createWithdrawCheck = (
  tradeSide: string,
  stableBank: ExtendedBankInfo,
  tokenBank: ExtendedBankInfo
): ActionMessageType => ({
  isEnabled: false,
  actionMethod: "WARNING",
  description: `Before you can ${tradeSide} this asset, you'll need to withdraw your supplied ${
    tradeSide === "long" ? stableBank.meta.tokenSymbol : tokenBank.meta.tokenSymbol
  }.`,
  code: 125,
  action: {
    type: ActionType.Withdraw,
    bank: tradeSide === "long" ? stableBank : tokenBank,
  },
});

const createRepayCheck = (
  tradeSide: string,
  stableBank: ExtendedBankInfo,
  tokenBank: ExtendedBankInfo
): ActionMessageType => ({
  isEnabled: false,
  actionMethod: "WARNING",
  description: `Before you can ${tradeSide} this asset, you'll need to repay your borrowed ${
    tradeSide === "long" ? tokenBank : stableBank
  }.`,
  code: 126,
  action: {
    type: ActionType.Repay,
    bank: tradeSide === "long" ? tokenBank : stableBank,
  },
});

const createLoopCheck = (
  tradeSide: string,
  stableBank: ExtendedBankInfo,
  tokenBank: ExtendedBankInfo
): ActionMessageType => ({
  isEnabled: false,
  actionMethod: "WARNING",
  description: `You are already ${tradeSide} this asset, you need to close that position before you can go ${
    tradeSide === "long" ? "short" : "long"
  }.`,
  code: 127,
  action: {
    type: ActionType.Repay,
    bank: tradeSide === "long" ? tokenBank : stableBank,
  },
});

const createPriceImpactErrorCheck = (priceImpactPct: number): ActionMessageType => {
  return {
    description: `Price impact is ${percentFormatter.format(priceImpactPct)}.`,
    code: 128,
    actionMethod: "ERROR",
    isEnabled: true,
  };
};

const createPriceImpactWarningCheck = (priceImpactPct: number): ActionMessageType => {
  return {
    description: `Price impact is ${percentFormatter.format(Number(priceImpactPct))}.`,
    isEnabled: true,
    actionMethod: "WARNING",
    code: 129,
  };
};

const checkErrorCodeMatch = (errorMessage: any, errorCode: number): boolean => {
  if (typeof errorMessage === "object") {
    const errorMessageString = JSON.stringify(errorMessage);
    return errorMessageString.includes(`${errorCode}`);
  }
  const hex = "0x" + errorCode.toString(16).padStart(4, "0");
  return errorMessage.includes(hex) || errorMessage.includes(errorCode.toString());
};

const checkErrorCodeExactMatch = (errorMessage: string, errorCode: number): boolean => {
  const hex = "0x" + errorCode.toString(16);
  const regex = new RegExp(`\\b${hex}\\b`);
  return regex.test(errorMessage);
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
  INSUFFICIENT_STAKE_BALANCE_CHECK: createInsufficientStakeBalanceCheck,
  REPAY_COLLAT_FAILED_CHECK: createRepayCollatFailedCheck,
  TRADE_FAILED_CHECK: createTradeFailedCheck,
  PROCESSING_TX_FAILED_CHECK: createProcessingTxFailedCheck,
  SIMULATION_FAILED_CHECK: createSimulationFailedCheck,
  EMODE_REDUCE_CHECK: createEmodeReduceCheck,
  EMODE_INCREASE_CHECK: createEmodeIncreaseCheck,
};

const createCustomError = (description: string): ActionMessageType => ({
  isEnabled: true,
  actionMethod: "WARNING",
  description,
});

export const handleError = (
  error: any,
  bank: ExtendedBankInfo | null,
  isArena: boolean = false,
  action?: string
): ActionMessageType | null => {
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
        checkErrorCodeMatch(error.message, 6049) || // Switchboard
        checkErrorCodeMatch(error.message, 6050) || // Pyth
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
        error.message?.toLowerCase()?.includes("block height exceeded") ||
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
        error?.logs?.some((entry: string[]) => entry.includes("insufficient lamport")) ||
        checkErrorCodeExactMatch(error.message, 1) ||
        error.message.includes("Attempt to debit an account but found no record of a prior credit") ||
        error.message.includes("AccountNotFound")
      ) {
        return STATIC_SIMULATION_ERRORS.INSUFICIENT_LAMPORTS;
      }

      if (
        checkErrorCodeMatch(error.message, 6003) ||
        error.message?.toLowerCase().includes("deposit capacity exceeded")
      ) {
        return STATIC_SIMULATION_ERRORS.DEPOSIT_CAP_EXCEEDED;
      }

      if (
        checkErrorCodeMatch(error.message, 6047) ||
        error.message?.toLowerCase().includes("can only deposit staked assets")
      ) {
        return STATIC_SIMULATION_ERRORS.STAKED_ONLY_SOL_CHECK;
      }

      if (checkErrorCodeMatch(error.message, 6027) || error.message?.toLowerCase().includes("borrow cap exceeded")) {
        return STATIC_SIMULATION_ERRORS.BORROW_CAP_EXCEEDED;
      }

      if (
        checkErrorCodeMatch(error.message, 6009) ||
        error.message?.toLowerCase().includes("bad health or stale oracle")
      ) {
        if (isArena) {
          return STATIC_SIMULATION_ERRORS.STALE_TRADING_OR_HEALTH;
        } else {
          return DYNAMIC_SIMULATION_ERRORS.STALE_CHECK(action ?? "The action");
        }
      }

      if (checkErrorCodeMatch(error.message, 6026) || error.message?.toLowerCase().includes("utilization ratio")) {
        return STATIC_SIMULATION_ERRORS.UTILIZATION_RATIO_INVALID;
      }

      // Jupiter error, 6001 is a Jupiter error code
      if (isArena && checkErrorCodeMatch(error.message, 6001)) {
        return STATIC_SIMULATION_ERRORS.SLIPPAGE;
      }

      if (checkErrorCodeMatch(error.message, 6041)) {
        return STATIC_SIMULATION_ERRORS.ILLEGAL_ACCOUNT_AUTHORITY_TRANSFER;
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
): ActionMessageType | undefined => {
  const action = handleError(error, bank, isArena);
  if (action) {
    return action;
  }
  console.error({ error: error });
  return DYNAMIC_SIMULATION_ERRORS.PROCESSING_TX_FAILED_CHECK(error.message);
};

export const handleSimulationError = (
  error: any,
  bank: ExtendedBankInfo | null,
  isArena: boolean = false,
  actionString?: string
): ActionMessageType | undefined => {
  const action = handleError(error, bank, isArena, actionString);
  if (action) {
    return action;
  }
  console.error({ error: error });
  return DYNAMIC_SIMULATION_ERRORS.SIMULATION_FAILED_CHECK(error.message);
};
