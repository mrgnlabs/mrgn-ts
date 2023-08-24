import { ActionType, ExtendedBankInfo, isActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

export function getCurrentAction(isLendingMode: boolean, bankInfo: ExtendedBankInfo): ActionType {
  if (!isActiveBankInfo(bankInfo)) {
    return isLendingMode ? ActionType.Deposit : ActionType.Borrow;
  } else {
    if (bankInfo.position.isLending) {
      if (isLendingMode) {
        return ActionType.Deposit;
      } else {
        return ActionType.Withdraw;
      }
    } else {
      if (isLendingMode) {
        return ActionType.Repay;
      } else {
        return ActionType.Borrow;
      }
    }
  }
}
