import { QuoteResponse } from "@jup-ag/api";

import { ActionMethod, DYNAMIC_SIMULATION_ERRORS, LstData } from "@mrgnlabs/mrgn-utils";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconAdjustmentsQuestion } from "@tabler/icons-react";

interface CheckActionAvailableProps {
  amount: number | null;
  connected: boolean;
  selectedBank: ExtendedBankInfo | null;
  actionQuote: QuoteResponse | null;
  lstData: LstData | null;
}

export function checkActionAvailable({
  amount,
  connected,
  selectedBank,
  actionQuote,
  lstData,
}: CheckActionAvailableProps): ActionMethod[] {
  let checks: ActionMethod[] = [];

  const requiredCheck = getRequiredCheck(connected, selectedBank);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount ?? 0);
  if (generalChecks) checks.push(...generalChecks);

  if (!actionQuote) checks.push({ isEnabled: false });

  if (actionQuote?.priceImpactPct && Number(actionQuote.priceImpactPct) > 0.01) {
    if (actionQuote?.priceImpactPct && Number(actionQuote.priceImpactPct) > 0.05) {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_ERROR_CHECK(Number(actionQuote.priceImpactPct)));
    } else {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_WARNING_CHECK(Number(actionQuote.priceImpactPct)));
    }
  }

  if (lstData && lstData?.updateRequired)
    checks.push({
      isEnabled: false,
      description: "Epoch change detected - staking available again shortly",
    });

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
