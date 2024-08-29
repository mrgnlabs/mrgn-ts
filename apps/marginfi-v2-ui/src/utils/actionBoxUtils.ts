import {
  ActionMethod,
  ActionMethodType,
  canBeBorrowed,
  canBeLent,
  canBeLooped,
  canBeLstStaked,
  canBeRepaid,
  canBeRepaidCollat,
  canBeWithdrawn,
  RepayType,
} from "@mrgnlabs/mrgn-utils";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import { QuoteResponse } from "@jup-ag/api";
import { PublicKey } from "@solana/web3.js";

import { StakeData } from "~/utils";

export function getColorForActionMethodType(type?: ActionMethodType) {
  if (type === "INFO") {
    return "info";
  } else if (type === "WARNING") {
    return "alert";
  } else {
    return "alert";
  }
}

interface CheckActionAvailableProps {
  amount: number | null;
  repayAmount: number | null;
  connected: boolean;
  nativeSolBalance: number;
  showCloseBalance?: boolean;
  selectedBank: ExtendedBankInfo | null;
  selectedRepayBank: ExtendedBankInfo | null;
  selectedStakingAccount: StakeData | null;
  extendedBankInfos: ExtendedBankInfo[];
  marginfiAccount: MarginfiAccountWrapper | null;
  actionMode: ActionType;
  blacklistRoutes: PublicKey[] | null;
  repayMode: RepayType;
  repayCollatQuote: QuoteResponse | null;
  lstQuoteMeta: QuoteResponseMeta | null;
}

export function checkActionAvailable({
  amount,
  repayAmount,
  nativeSolBalance,
  connected,
  showCloseBalance,
  selectedBank,
  selectedRepayBank,
  selectedStakingAccount,
  extendedBankInfos,
  marginfiAccount,
  actionMode,
  blacklistRoutes,
  repayMode,
  repayCollatQuote,
  lstQuoteMeta,
}: CheckActionAvailableProps): ActionMethod[] {
  let checks: ActionMethod[] = [];

  const requiredCheck = getRequiredCheck(connected, selectedBank, selectedStakingAccount);
  if (requiredCheck) return [requiredCheck];

  const generalChecks = getGeneralChecks(amount ?? 0, repayAmount ?? 0, showCloseBalance);
  if (generalChecks) checks.push(...generalChecks);

  // allert checks
  if (selectedBank) {
    switch (actionMode) {
      case ActionType.Deposit:
        const lentChecks = canBeLent(selectedBank, nativeSolBalance);
        if (lentChecks.length) checks.push(...lentChecks);
        break;
      case ActionType.Withdraw:
        const withdrawChecks = canBeWithdrawn(selectedBank, marginfiAccount);
        if (withdrawChecks.length) checks.push(...withdrawChecks);
        break;
      case ActionType.Borrow:
        const borrowChecks = canBeBorrowed(selectedBank, extendedBankInfos, marginfiAccount);
        if (borrowChecks.length) checks.push(...borrowChecks);
        break;
      case ActionType.Loop:
        const loopChecks = canBeLooped(selectedBank, selectedRepayBank, repayCollatQuote);
        if (loopChecks.length) checks.push(...loopChecks);
        break;
      case ActionType.Repay:
        let repayChecks;
        if (repayMode === RepayType.RepayRaw) {
          repayChecks = canBeRepaid(selectedBank);
        } else if (repayMode === RepayType.RepayCollat) {
          repayChecks = canBeRepaidCollat(selectedBank, selectedRepayBank, repayCollatQuote);
        }
        if (repayChecks) checks.push(...repayChecks);
        break;
      case ActionType.MintLST:
        const lstStakeChecks = canBeLstStaked(lstQuoteMeta as any);
        if (lstStakeChecks) checks.push(...lstStakeChecks);
        break;
      case ActionType.UnstakeLST:
        const lstUnstakeChecks = canBeLstStaked(lstQuoteMeta as any);
        if (lstUnstakeChecks) checks.push(...lstUnstakeChecks);
        break;

      // case ActionType.MintYBX:
      //   if (check) checks.push(check);
      //   break;
    }
  }

  if (checks.length === 0)
    checks.push({
      isEnabled: true,
    });

  return checks;
}

function getRequiredCheck(
  connected: boolean,
  selectedBank: ExtendedBankInfo | null,
  selectedStakingAccount: StakeData | null
): ActionMethod | null {
  if (!connected) {
    return { isEnabled: false };
  }
  if (!selectedBank && !selectedStakingAccount) {
    return { isEnabled: false };
  }

  return null;
}

function getGeneralChecks(amount: number = 0, repayAmount: number = 0, showCloseBalance?: boolean): ActionMethod[] {
  let checks: ActionMethod[] = [];
  if (showCloseBalance) {
    checks.push({ actionMethod: "INFO", description: "Close lending balance.", isEnabled: true });
  }

  if (amount === 0 && repayAmount === 0) {
    checks.push({ isEnabled: false });
  }

  return checks;
}
