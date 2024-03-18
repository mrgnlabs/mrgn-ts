import { floor, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo, ExtendedBankInfo, FEE_MARGIN } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  MarginfiAccountWrapper,
  MarginRequirementType,
  OperationalState,
  RiskTier,
} from "@mrgnlabs/marginfi-client-v2";
import { QuoteResponse } from "@jup-ag/api";
import { PublicKey } from "@solana/web3.js";

import { StakeData } from "~/utils";

export enum RepayType {
  RepayRaw = "Repay",
  RepayCollat = "Collateral Repay",
}

export enum LstType {
  Token = "Token",
  Native = "Native Stake",
}

export type ActionMethodType = "WARNING" | "ERROR" | "INFO";
export interface ActionMethod {
  isEnabled: boolean;
  isInfo?: boolean;
  description?: string;
}

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
  directRoutes: PublicKey[] | null;
  repayMode: RepayType;
  repayCollatQuote: QuoteResponse | null;
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
  directRoutes,
  repayMode,
  repayCollatQuote,
}: CheckActionAvailableProps): ActionMethod {
  let check: ActionMethod | null = null;

  check = generalChecks(
    connected,
    selectedBank,
    selectedStakingAccount,
    amount ?? 0,
    repayAmount ?? 0,
    showCloseBalance
  );
  if (check) return check;

  if (selectedBank) {
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
        if (repayMode === RepayType.RepayRaw) {
          check = canBeRepaid(selectedBank);
        } else if (repayMode === RepayType.RepayCollat) {
          check = canBeRepaidCollat(selectedBank, selectedRepayBank, directRoutes, repayCollatQuote);
        }
        if (check) return check;
        break;
      case ActionType.MintYBX:
        // canBeYBXed
        if (check) return check;
        break;
    }
  }
  return {
    isEnabled: true,
  };
}

function generalChecks(
  connected: boolean,
  selectedBank: ExtendedBankInfo | null,
  selectedStakingAccount: StakeData | null,
  amount: number = 0,
  repayAmount: number = 0,
  showCloseBalance?: boolean
): ActionMethod | null {
  if (!connected) {
    return { isEnabled: false };
  }
  if (!selectedBank && !selectedStakingAccount) {
    return { isEnabled: false };
  }
  if (showCloseBalance) {
    return { isInfo: true, description: "Close lending balance.", isEnabled: true };
  }

  if (amount === 0 && repayAmount === 0) {
    return { isEnabled: false };
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

function canBeRepaidCollat(
  targetBankInfo: ExtendedBankInfo,
  repayBankInfo: ExtendedBankInfo | null,
  directRoutes: PublicKey[] | null,
  swapQuote: QuoteResponse | null
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

  if (targetBankInfo.position.isLending) {
    return {
      description: `You are not borrowing ${targetBankInfo.meta.tokenSymbol}.`,
      isEnabled: false,
    };
  }

  // if (repayBankInfo && directRoutes) {
  //   if (!directRoutes.find((key) => key.equals(repayBankInfo.info.state.mint))) {
  //     return {
  //       description: "Repayment not possible with current collateral, choose another.",
  //       isEnabled: false,
  //     };
  //   }
  // } else {
  //   return { isEnabled: false };
  // }

  if (!swapQuote) {
    return { isEnabled: false };
  }

  // always as last check since if isEnabled: true
  if (targetBankInfo.userInfo.tokenAccount.balance > 0) {
    return {
      description: `You have ${targetBankInfo.meta.tokenSymbol} in your wallet and can repay without using collateral.`,
      isEnabled: true,
      isInfo: true,
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
