import { QuoteResponse } from "@jup-ag/api";

import { OperationalState } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionMessageType,
  DYNAMIC_SIMULATION_ERRORS,
  isBankOracleStale,
  MAX_SLIPPAGE_PERCENTAGE,
  STATIC_SIMULATION_ERRORS,
} from "@mrgnlabs/mrgn-utils";
import { ArenaBank, GroupStatus } from "~/types/trade-store.types";

interface CheckTradeActionAvailableProps {
  amount: number | null;
  connected: boolean;
  depositBank: ArenaBank | null;
  borrowBank: ArenaBank | null;
  actionQuote: QuoteResponse | null;
  tradeState: "long" | "short";
  leverage: number;
  groupStatus: GroupStatus;
}

export function checkTradeActionAvailable({
  amount,
  connected,
  depositBank,
  borrowBank,
  actionQuote,
  tradeState,
  groupStatus,
  leverage,
}: CheckTradeActionAvailableProps): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  const requiredCheck = getRequiredCheck(connected, depositBank);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount ?? 0, leverage);
  if (generalChecks) checks.push(...generalChecks);

  const tradeSpecificChecks = getTradeSpecificChecks(groupStatus, tradeState, borrowBank, depositBank);
  if (tradeSpecificChecks) checks.push(...tradeSpecificChecks);

  // allert checks
  if (depositBank) {
    const tradeChecks = canBeTraded(depositBank, borrowBank, actionQuote);
    if (tradeChecks.length) checks.push(...tradeChecks);
  }

  if (checks.length === 0)
    checks.push({
      isEnabled: true,
    });

  return checks;
}

function getRequiredCheck(connected: boolean, selectedBank: ArenaBank | null): ActionMessageType | null {
  if (!connected) {
    return { isEnabled: false };
  }
  if (!selectedBank) {
    return { isEnabled: false };
  }

  return null;
}

function getGeneralChecks(amount: number = 0, leverage: number, showCloseBalance?: boolean): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  if (showCloseBalance) {
    checks.push({ actionMethod: "INFO", description: "Close lending balance.", isEnabled: true });
  }

  if (amount === 0) {
    checks.push({ isEnabled: false });
  }

  if (leverage === 0) {
    checks.push({ isEnabled: false });
  }

  return checks;
}

function canBeTraded(
  collateralBank: ArenaBank,
  secondaryBank: ArenaBank | null,
  swapQuote: QuoteResponse | null
): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  const isTargetBankPaused = collateralBank.info.rawBank.config.operationalState === OperationalState.Paused;
  const isRepayBankPaused = secondaryBank?.info.rawBank.config.operationalState === OperationalState.Paused;

  if (isTargetBankPaused || isRepayBankPaused) {
    checks.push(
      DYNAMIC_SIMULATION_ERRORS.BANK_PAUSED_CHECK(
        isTargetBankPaused ? collateralBank.info.rawBank.tokenSymbol : secondaryBank?.info.rawBank.tokenSymbol
      )
    );
  }

  if (swapQuote && swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.01) {
    //invert
    if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.05) {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_ERROR_CHECK(Number(swapQuote.priceImpactPct)));
    } else {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_WARNING_CHECK(Number(swapQuote.priceImpactPct)));
    }
  }

  if (swapQuote && swapQuote?.slippageBps && swapQuote.slippageBps / 100 > MAX_SLIPPAGE_PERCENTAGE) {
    checks.push(STATIC_SIMULATION_ERRORS.SLIPPAGE_TOO_HIGH);
  }

  return checks;
}

function getTradeSpecificChecks(
  groupStatus: GroupStatus,
  tradeState: "long" | "short",
  borrowBank: ArenaBank | null,
  depositBank: ArenaBank | null
): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  if (groupStatus === GroupStatus.LP) {
    const providingLpBorrowBank = borrowBank?.isActive && borrowBank?.position.isLending;

    if (providingLpBorrowBank) {
      checks.push({
        isEnabled: false,
        description: `You cannot ${tradeState} while you're providing liquidity for ${borrowBank?.info.rawBank.tokenSymbol}. To proceed, remove your liquidity position for this asset.`,
        // action: {
        //   bank: borrowBank,
        //   type: ActionType.Withdraw,
        // }, // TODO: add this once info messages are implemented
      });
    } else {
      checks.push({
        isEnabled: true,
        actionMethod: "INFO",
        description: `You're providing liquidity for ${depositBank?.info.rawBank.tokenSymbol}. Keep this in mind when managing your positions.`,
      });
    }
  }

  if (groupStatus === GroupStatus.LONG || groupStatus === GroupStatus.SHORT) {
    if (borrowBank?.isActive && borrowBank?.position.isLending) {
      checks.push({
        isEnabled: false,
        description: `You cannot ${tradeState} while you have an active ${
          tradeState === "long" ? "short" : "long"
        } position for this token.`,
      });
    }
  }

  return checks;
}
