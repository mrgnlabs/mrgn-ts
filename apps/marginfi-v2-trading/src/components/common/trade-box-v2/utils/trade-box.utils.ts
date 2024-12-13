import { QuoteResponse } from "@jup-ag/api";
import { OperationalState } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMessageType, DYNAMIC_SIMULATION_ERRORS, isBankOracleStale } from "@mrgnlabs/mrgn-utils";
import { ArenaBank } from "~/store/tradeStoreV2";

interface CheckTradeActionAvailableProps {
  amount: number | null;
  connected: boolean;
  collateralBank: ArenaBank | null;
  secondaryBank: ArenaBank | null;
  actionQuote: QuoteResponse | null;
  tradeState: "long" | "short";
}

export function checkTradeActionAvailable({
  amount,
  connected,
  collateralBank,
  secondaryBank,
  actionQuote,
  tradeState,
}: CheckTradeActionAvailableProps): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  const requiredCheck = getRequiredCheck(connected, collateralBank);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount ?? 0);
  if (generalChecks) checks.push(...generalChecks);

  const tradeSpecificChecks = getTradeSpecificChecks(tradeState, secondaryBank);
  if (tradeSpecificChecks) checks.push(...tradeSpecificChecks);

  // allert checks
  if (collateralBank) {
    const tradeChecks = canBeTraded(collateralBank, secondaryBank, actionQuote);
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

function getGeneralChecks(amount: number = 0, showCloseBalance?: boolean): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  if (showCloseBalance) {
    checks.push({ actionMethod: "INFO", description: "Close lending balance.", isEnabled: true });
  }

  if (amount === 0) {
    checks.push({ isEnabled: false });
  }

  return checks;
}

function canBeTraded(
  targetBankInfo: ArenaBank,
  repayBankInfo: ArenaBank | null,
  swapQuote: QuoteResponse | null
): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  const isTargetBankPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  const isRepayBankPaused = repayBankInfo?.info.rawBank.config.operationalState === OperationalState.Paused;

  if (isTargetBankPaused || isRepayBankPaused) {
    checks.push(
      DYNAMIC_SIMULATION_ERRORS.BANK_PAUSED_CHECK(
        isTargetBankPaused ? targetBankInfo.info.rawBank.tokenSymbol : repayBankInfo?.info.rawBank.tokenSymbol
      )
    );
  }

  if (!swapQuote) {
    checks.push({
      isEnabled: false,
    });
  }

  if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.01) {
    //invert
    if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.05) {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_ERROR_CHECK(Number(swapQuote.priceImpactPct)));
    } else {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_WARNING_CHECK(Number(swapQuote.priceImpactPct)));
    }
  }

  if ((repayBankInfo && isBankOracleStale(repayBankInfo)) || (targetBankInfo && isBankOracleStale(targetBankInfo))) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.STALE_CHECK("Trading"));
  }
  return checks;
}

function getTradeSpecificChecks(tradeState: "long" | "short", secondaryBank: ArenaBank | null): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  if (secondaryBank?.isActive && (secondaryBank as ActiveBankInfo)?.position.isLending) {
    checks.push({
      isEnabled: false,
      description: `You cannot ${tradeState} while you have an active ${
        tradeState === "long" ? "short" : "long"
      } position for this token.`,
    });
  }

  return checks;
}
