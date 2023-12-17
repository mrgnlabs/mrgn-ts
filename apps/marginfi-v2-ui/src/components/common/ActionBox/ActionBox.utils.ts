import { floor, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo, ExtendedBankInfo, FEE_MARGIN } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginRequirementType, RiskTier } from "@mrgnlabs/marginfi-client-v2";

interface props {
  amount: number;
  connected: boolean;
  nativeSolBalance: number;
  showCloseBalance: boolean;
  selectedBank: ExtendedBankInfo | null;
  extendedBankInfos: ExtendedBankInfo[];
  marginfiAccount?: MarginfiAccountWrapper;
  actionMode: ActionType;
}

export interface ActionMethod {
  instruction: string;
  isEnabled: boolean;
  description?: string;
}

export function checkActionAvailable({
  amount,
  nativeSolBalance,
  connected,
  showCloseBalance,
  selectedBank,
  extendedBankInfos,
  marginfiAccount,
  actionMode,
}: props): ActionMethod {
  let check: ActionMethod;

  check = generalChecks(connected, selectedBank, showCloseBalance);
  if (check) return check;

  switch (actionMode) {
    case ActionType.Deposit:
      check = canBeLent(selectedBank, nativeSolBalance);
      if (check) return check;
      break;
    case ActionType.Withdraw:
      check = canBeWithdrawn(selectedBank);
      if (check) return check;
      break;
    case ActionType.Borrow:
      check = canBeBorrowed(selectedBank, extendedBankInfos, marginfiAccount);
      if (check) return check;
      break;
    case ActionType.Repay:
      check = canBeRepaid(selectedBank);
      if (check) return check;
      break;
  }

  if (amount <= 0) {
    return {
      instruction: "Add an amount",
      isEnabled: false,
    };
  }

  return {
    instruction: actionMode,
    isEnabled: true,
  };
}

function generalChecks(
  connected: boolean,
  selectedBank: ExtendedBankInfo | null,
  showCloseBalance: boolean
): ActionMethod | null {
  if (!connected) {
    return { instruction: "Connect your wallet", isEnabled: false };
  }
  if (!selectedBank) {
    return { instruction: "Select token and amount", isEnabled: false };
  }

  if (showCloseBalance) {
    return { instruction: "Close account", isEnabled: true };
  }

  return null;
}

function canBeWithdrawn(targetBankInfo: ExtendedBankInfo): ActionMethod | null {
  if (!targetBankInfo.isActive) {
    return {
      instruction: "No position found",
      isEnabled: false,
    };
  }

  if (!targetBankInfo.position.isLending) {
    return {
      instruction: `You&apos;re not lending ${targetBankInfo.meta.tokenSymbol}`,
      isEnabled: false,
    };
  }

  if (targetBankInfo.userInfo.maxWithdraw === 0) {
    return {
      instruction: "Nothing to withdraw",
      isEnabled: false,
    };
  }

  return null;
}

function canBeRepaid(targetBankInfo: ExtendedBankInfo): ActionMethod | null {
  if (!targetBankInfo.isActive) {
    return {
      instruction: "No position found",
      isEnabled: false,
    };
  }

  if (targetBankInfo.position.isLending) {
    return {
      instruction: `You are not borrowing ${targetBankInfo.meta.tokenSymbol}`,
      isEnabled: false,
    };
  }

  if (targetBankInfo.userInfo.maxRepay === 0) {
    return {
      instruction: `Insufficient ${targetBankInfo.meta.tokenSymbol} in wallet for loan repayment`,
      isEnabled: false,
    };
  }

  return null;
}

function canBeBorrowed(
  targetBankInfo: ExtendedBankInfo,
  extendedBankInfos: ExtendedBankInfo[],
  marginfiAccount: MarginfiAccountWrapper | null
): ActionMethod | null {
  const alreadyLending = targetBankInfo.isActive && targetBankInfo.position.isLending;
  if (alreadyLending) {
    return {
      instruction: "Close your position first",
      description: "You are already lending this asset, you need to close that position first to start borrowing.",
      isEnabled: false,
    };
  }

  const isFull = targetBankInfo.info.rawBank.computeRemainingCapacity().borrowCapacity.lte(0);
  if (isFull) {
    return {
      instruction: "Bank is full",
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is at borrow capacity.`,
      isEnabled: false,
    };
  }

  const freeCollateral = marginfiAccount && marginfiAccount.computeFreeCollateral();
  if (freeCollateral && freeCollateral.eq(0)) {
    return {
      instruction: "Insufficient collateral",
      description: "You don't have any available collateral.",
      isEnabled: false,
    };
  }

  const existingLiabilityBanks = extendedBankInfos.filter((b) => b.isActive) as ActiveBankInfo[];
  const existingIsolatedBorrow = existingLiabilityBanks.find(
    (b) => b.info.rawBank.config.riskTier === RiskTier.Isolated && !b.address.equals(targetBankInfo.address)
  );
  if (existingIsolatedBorrow) {
    return {
      instruction: "Existing isolated borrow",
      description: `You have an active isolated borrow (${existingIsolatedBorrow.meta.tokenSymbol}). You cannot borrow another asset while you do.`,
      isEnabled: false,
    };
  }

  const attemptingToBorrowIsolatedAssetWithActiveDebt =
    targetBankInfo.info.rawBank.config.riskTier === RiskTier.Isolated &&
    !marginfiAccount
      .computeHealthComponents(MarginRequirementType.Equity, [targetBankInfo.address])
      .liabilities.isZero();
  if (attemptingToBorrowIsolatedAssetWithActiveDebt) {
    return {
      instruction: "Existing borrow",
      description: "You cannot borrow an isolated asset with existing borrows.",
      isEnabled: false,
    };
  }

  return null;
}

function canBeLent(targetBankInfo: ExtendedBankInfo, nativeSolBalance: number): ActionMethod | null {
  const alreadyBorrowing = targetBankInfo.isActive && !targetBankInfo.position.isLending;
  if (alreadyBorrowing) {
    return {
      instruction: "Repay your position first",
      description: "You are already borrowing this asset, you need to repay that position first to start lending.",
      isEnabled: false,
    };
  }

  const isFull = targetBankInfo.info.rawBank.computeRemainingCapacity().depositCapacity.lte(0);
  if (isFull) {
    return {
      instruction: "Bank is full",
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is at deposit capacity.`,
      isEnabled: false,
    };
  }

  const isWrappedSol = targetBankInfo.info.state.mint.equals(WSOL_MINT);
  const walletBalance = floor(
    isWrappedSol
      ? Math.max(targetBankInfo.userInfo.tokenAccount.balance + nativeSolBalance - FEE_MARGIN, 0)
      : targetBankInfo.userInfo.tokenAccount.balance,
    targetBankInfo.info.state.mintDecimals
  );

  if (walletBalance === 0) {
    return { instruction: `Insufficient ${targetBankInfo.meta.tokenSymbol} in wallet`, isEnabled: false };
  }

  return null;
}
