import { QuoteResponse } from "@jup-ag/api";

import { ActionMessageType, canBeLooped, getTradeSpecificChecks, ArenaGroupStatus } from "@mrgnlabs/mrgn-utils";
import { ArenaBank } from "~/types/trade-store.types";

interface CheckTradeActionAvailableProps {
  amount: number | null;
  connected: boolean;
  depositBank: ArenaBank | null;
  borrowBank: ArenaBank | null;
  actionQuote: QuoteResponse | null;
  tradeState: "long" | "short";
  leverage: number;
  groupStatus: ArenaGroupStatus;
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

  if (depositBank) {
    const tradeChecks = canBeLooped(depositBank, borrowBank, null, actionQuote);
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
