import { ActionType, ExtendedBankInfo } from "../types";

function getCurrentAction(isLendingMode: boolean, bank: ExtendedBankInfo): ActionType {
  if (!bank.isActive) {
    return isLendingMode ? ActionType.Deposit : ActionType.Borrow;
  } else {
    if (bank.position.isLending) {
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

export { getCurrentAction };
