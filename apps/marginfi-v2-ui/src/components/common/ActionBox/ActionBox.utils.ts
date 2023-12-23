import { floor, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo, ExtendedBankInfo, FEE_MARGIN } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  MarginfiAccountWrapper,
  MarginRequirementType,
  OperationalState,
  RiskTier,
} from "@mrgnlabs/marginfi-client-v2";

interface props {
  amount: number | null;
  connected: boolean;
  nativeSolBalance: number;
  showCloseBalance?: boolean;
  selectedBank: ExtendedBankInfo | null;
  extendedBankInfos: ExtendedBankInfo[];
  marginfiAccount: MarginfiAccountWrapper | null;
  actionMode: ActionType;
}

export interface ActionMethod {
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
  let check: ActionMethod | null = null;

  check = generalChecks(connected, selectedBank, showCloseBalance);
  if (check) return check;

  if (!selectedBank) {
    // this shouldn't happen
    return { description: "Something went wrong", isEnabled: false };
  }

  switch (actionMode) {
    case ActionType.Deposit:
      check = canBeLent(selectedBank, nativeSolBalance);
      if (check) return check;
      break;
    case ActionType.Withdraw:
      check = canBeWithdrawn(selectedBank, marginfiAccount);
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

  if (amount && amount <= 0) {
    return {
      description: "Add an amount",
      isEnabled: false,
    };
  }

  return {
    isEnabled: true,
  };
}

function generalChecks(
  connected: boolean,
  selectedBank: ExtendedBankInfo | null,
  showCloseBalance?: boolean
): ActionMethod | null {
  if (!connected) {
    return { isEnabled: false };
  }
  if (!selectedBank) {
    return { isEnabled: false };
  }

  if (showCloseBalance) {
    return { description: "Close account.", isEnabled: true };
  }

  return null;
}

function canBeWithdrawn(
  targetBankInfo: ExtendedBankInfo,
  marginfiAccount: MarginfiAccountWrapper | null
): ActionMethod | null {
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  if (isPaused) {
    return {
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    };
  }

  if (!targetBankInfo.isActive) {
    return {
      description: "No position found.",
      isEnabled: false,
    };
  }

  if (!targetBankInfo.position.isLending) {
    return {
      description: `You&apos;re not lending ${targetBankInfo.meta.tokenSymbol}.`,
      isEnabled: false,
    };
  }

  const noFreeCollateral = marginfiAccount && marginfiAccount.computeFreeCollateral().isZero();
  if (noFreeCollateral) {
    return {
      description: "No available collateral.",
      isEnabled: true,
    };
  }

  return null;
}

function canBeRepaid(targetBankInfo: ExtendedBankInfo): ActionMethod | null {
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  if (isPaused) {
    return {
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    };
  }

  if (!targetBankInfo.isActive) {
    return {
      description: "No position found.",
      isEnabled: false,
    };
  }

  if (targetBankInfo.position.isLending) {
    return {
      description: `You are not borrowing ${targetBankInfo.meta.tokenSymbol}.`,
      isEnabled: false,
    };
  }

  if (targetBankInfo.userInfo.maxRepay === 0) {
    return {
      description: `Insufficient ${targetBankInfo.meta.tokenSymbol} in wallet for loan repayment.`,
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
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  if (isPaused) {
    return {
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    };
  }

  const isReduceOnly = targetBankInfo.info.rawBank.config.operationalState === OperationalState.ReduceOnly;
  if (isReduceOnly) {
    return {
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is in reduce-only mode. You may only withdraw a deposit or repay a loan.`,
      isEnabled: false,
    };
  }

  const isBeingRetired =
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Initial, targetBankInfo.info.oraclePrice, true)
      .eq(0) &&
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Maintenance, targetBankInfo.info.oraclePrice)
      .gt(0);
  if (isBeingRetired) {
    return {
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is being retired. You may only withdraw a deposit or repay a loan.`,
      isEnabled: false,
    };
  }

  const isFull = targetBankInfo.info.rawBank.computeRemainingCapacity().borrowCapacity.lte(0);
  if (isFull) {
    return {
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is at borrow capacity.`,
      isEnabled: false,
    };
  }

  const alreadyLending = targetBankInfo.isActive && targetBankInfo.position.isLending;
  if (alreadyLending) {
    return {
      description: "You are already lending this asset, you need to close that position first to start borrowing.",
      isEnabled: false,
    };
  }

  const freeCollateral = marginfiAccount && marginfiAccount.computeFreeCollateral();
  if (!freeCollateral || (freeCollateral && freeCollateral.eq(0))) {
    return {
      description: "You don't have any available collateral.",
      isEnabled: false,
    };
  }

  const existingLiabilityBanks = extendedBankInfos.filter(
    (b) => b.isActive && !b.position.isLending
  ) as ActiveBankInfo[];
  const existingIsolatedBorrow = existingLiabilityBanks.find(
    (b) => b.info.rawBank.config.riskTier === RiskTier.Isolated && !b.address.equals(targetBankInfo.address)
  );
  if (existingIsolatedBorrow) {
    return {
      description: `You have an active isolated borrow (${existingIsolatedBorrow.meta.tokenSymbol}). You cannot borrow another asset while you do.`,
      isEnabled: false,
    };
  }

  const attemptingToBorrowIsolatedAssetWithActiveDebt =
    targetBankInfo.info.rawBank.config.riskTier === RiskTier.Isolated &&
    !marginfiAccount
      ?.computeHealthComponents(MarginRequirementType.Equity, [targetBankInfo.address])
      .liabilities.isZero();
  if (attemptingToBorrowIsolatedAssetWithActiveDebt) {
    return {
      description: "You cannot borrow an isolated asset with existing borrows.",
      isEnabled: false,
    };
  }

  return null;
}

function canBeLent(targetBankInfo: ExtendedBankInfo, nativeSolBalance: number): ActionMethod | null {
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  if (isPaused) {
    return {
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is paused at this time.`,
      isEnabled: false,
    };
  }

  const isReduceOnly = targetBankInfo.info.rawBank.config.operationalState === OperationalState.ReduceOnly;
  if (isReduceOnly) {
    return {
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is in reduce-only mode. You may only withdraw a deposit or repay a loan.`,
      isEnabled: false,
    };
  }

  const isBeingRetired =
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Initial, targetBankInfo.info.oraclePrice, true)
      .eq(0) &&
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Maintenance, targetBankInfo.info.oraclePrice)
      .gt(0);
  if (isBeingRetired) {
    return {
      description: `The ${targetBankInfo.info.rawBank.tokenSymbol} bank is being retired. You may only withdraw a deposit or repay a loan.`,
      isEnabled: false,
    };
  }

  const alreadyBorrowing = targetBankInfo.isActive && !targetBankInfo.position.isLending;
  if (alreadyBorrowing) {
    return {
      description: "You are already borrowing this asset, you need to repay that position first to start lending.",
      isEnabled: false,
    };
  }

  const isFull = targetBankInfo.info.rawBank.computeRemainingCapacity().depositCapacity.lte(0);
  if (isFull) {
    return {
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
    return { description: `Insufficient ${targetBankInfo.meta.tokenSymbol} in wallet.`, isEnabled: false };
  }

  return null;
}
