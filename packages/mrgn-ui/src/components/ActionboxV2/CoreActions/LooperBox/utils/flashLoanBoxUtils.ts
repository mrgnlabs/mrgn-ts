import { ActionMethod, canBeLooped, canBeRepaidCollat } from "@mrgnlabs/mrgn-utils";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { QuoteResponse } from "@jup-ag/api";

interface CheckActionAvailableProps {
  amount: number | null;
  connected: boolean;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;

  actionMode: ActionType;

  actionQuote: QuoteResponse | null;
}

export function checkActionAvailable({
  amount,
  connected,
  selectedBank,
  selectedSecondaryBank,
  actionMode,
  actionQuote,
}: CheckActionAvailableProps): ActionMethod[] {
  let checks: ActionMethod[] = [];

  const requiredCheck = getRequiredCheck(connected, selectedBank);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount ?? 0);
  if (generalChecks) checks.push(...generalChecks);

  // allert checks
  if (selectedBank) {
    switch (actionMode) {
      case ActionType.Loop:
        const loopChecks = canBeLooped(selectedBank, selectedSecondaryBank, actionQuote);
        if (loopChecks.length) checks.push(...loopChecks);
        break;
      case ActionType.RepayCollat:
        const repayChecks = canBeRepaidCollat(selectedBank, selectedSecondaryBank, actionQuote);
        if (repayChecks) checks.push(...repayChecks);
        break;
    }
  }

  if (checks.length === 0)
    checks.push({
      isEnabled: true,
    });

  return checks;
}

function getRequiredCheck(connected: boolean, selectedBank: ExtendedBankInfo | null): ActionMethod | null {
  if (!connected) {
    return { isEnabled: false };
  }
  if (!selectedBank) {
    return { isEnabled: false };
  }

  return null;
}

function getGeneralChecks(amount: number = 0): ActionMethod[] {
  let checks: ActionMethod[] = [];

  if (amount === 0) {
    checks.push({ isEnabled: false });
  }

  return checks;
}
