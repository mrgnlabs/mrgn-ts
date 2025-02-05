import { floor, percentFormatter, WalletToken, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ActionMessageType } from "./types";
import { QuoteResponse } from "@jup-ag/api";
import {
  MarginfiAccountWrapper,
  OperationalState,
  MarginRequirementType,
  RiskTier,
} from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, ActiveBankInfo, FEE_MARGIN } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";
import { DYNAMIC_SIMULATION_ERRORS, STATIC_SIMULATION_ERRORS } from "../errors";

type QuoteResponseMeta = {
  quoteResponse: QuoteResponse;
  original: any;
};

function isBankOracleStale(bank: ExtendedBankInfo) {
  // NOTE: Hot fix to temporary remove oracle stale warnings.
  // return bank.info.rawBank.lastUpdate + 60 > Math.round(Date.now() / 1000);
  return false;
}

export {
  canBeWithdrawn,
  canBeRepaid,
  canBeRepaidCollat,
  canBeLooped,
  canBeBorrowed,
  canBeLent,
  canBeLstStaked,
  canBeDepositSwapped,
};

function canBeWithdrawn(
  targetBankInfo: ExtendedBankInfo,
  marginfiAccount: MarginfiAccountWrapper | null
): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  if (isPaused) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.BANK_PAUSED_CHECK(targetBankInfo.info.rawBank.tokenSymbol));
  }

  if (!targetBankInfo.isActive) {
    checks.push(STATIC_SIMULATION_ERRORS.NO_POSITIONS);
  }

  if (targetBankInfo.isActive && !targetBankInfo.position.isLending) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.IF_LENDING_CHECK(targetBankInfo.meta.tokenSymbol));
  }

  const noFreeCollateral = marginfiAccount && marginfiAccount.computeFreeCollateral().isZero();
  if (noFreeCollateral && !targetBankInfo.info.state.isIsolated) {
    checks.push(STATIC_SIMULATION_ERRORS.NO_COLLATERAL);
  }

  if (targetBankInfo && isBankOracleStale(targetBankInfo)) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.STALE_CHECK("Withdrawals"));
  }

  return checks;
}

function canBeRepaid(targetBankInfo: ExtendedBankInfo, repayCollatAction: boolean = false): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  if (isPaused) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.BANK_PAUSED_CHECK(targetBankInfo.info.rawBank.tokenSymbol));
  }

  if (!targetBankInfo.isActive) {
    checks.push(STATIC_SIMULATION_ERRORS.NO_POSITIONS);
  }

  if (targetBankInfo.isActive && targetBankInfo.position.isLending) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.IF_BORROWING_CHECK(targetBankInfo.meta.tokenSymbol));
  }

  if (targetBankInfo.userInfo.maxRepay === 0) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.SUFFICIENT_LIQ_CHECK(targetBankInfo.meta.tokenSymbol, repayCollatAction));
  }

  return checks;
}

function canBeRepaidCollat(
  targetBankInfo: ExtendedBankInfo,
  repayBankInfo: ExtendedBankInfo | null,
  blacklistRoutes: PublicKey[] | null,
  swapQuote: QuoteResponse | null,
  maxOverflowHit?: boolean
): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;

  if (isPaused) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.BANK_PAUSED_CHECK(targetBankInfo.info.rawBank.tokenSymbol));
  }

  if (!targetBankInfo.isActive) {
    checks.push(STATIC_SIMULATION_ERRORS.NO_POSITIONS);
  }

  if (targetBankInfo.isActive && targetBankInfo.position.isLending) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.IF_BORROWING_CHECK(targetBankInfo.meta.tokenSymbol));
  }

  if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.01) {
    //invert
    if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.05) {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_ERROR_CHECK(Number(swapQuote.priceImpactPct)));
    } else {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_WARNING_CHECK(Number(swapQuote.priceImpactPct)));
    }
  }

  if (!swapQuote) {
    checks.push({ isEnabled: false });
  }

  if ((repayBankInfo && isBankOracleStale(repayBankInfo)) || (targetBankInfo && isBankOracleStale(targetBankInfo))) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.STALE_CHECK("Repayments"));
  }

  if (targetBankInfo.userInfo.tokenAccount.balance > 0) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.WALLET_REPAY_CHECK(targetBankInfo.meta.tokenSymbol));
  }

  if (maxOverflowHit) {
    checks.push({
      isEnabled: true,
      description: "Collateral repay is limited to $250K per transaction.",
      actionMethod: "INFO",
    });
  }
  return checks;
}

function canBeLooped(
  targetBankInfo: ExtendedBankInfo,
  repayBankInfo: ExtendedBankInfo | null,
  swapQuote?: QuoteResponse | null,
  extendedBankInfos?: ExtendedBankInfo[]
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

  if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.01) {
    //invert
    if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.05) {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_ERROR_CHECK(Number(swapQuote.priceImpactPct)));
    } else {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_WARNING_CHECK(Number(swapQuote.priceImpactPct)));
    }
  }

  if ((repayBankInfo && isBankOracleStale(repayBankInfo)) || (targetBankInfo && isBankOracleStale(targetBankInfo))) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.STALE_CHECK("Looping"));
  }

  if (extendedBankInfos && extendedBankInfos.some((bank) => bank.isActive && bank.info.rawBank.config.assetTag === 2)) {
    checks.push(STATIC_SIMULATION_ERRORS.STAKED_ONLY_SOL_CHECK);
  }

  return checks;
}

function canBeBorrowed(
  targetBankInfo: ExtendedBankInfo,
  extendedBankInfos: ExtendedBankInfo[],
  marginfiAccount: MarginfiAccountWrapper | null
): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  if (isPaused) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.BANK_PAUSED_CHECK(targetBankInfo.info.rawBank.tokenSymbol));
  }

  const isReduceOnly = targetBankInfo.info.rawBank.config.operationalState === OperationalState.ReduceOnly;
  if (isReduceOnly) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.REDUCE_ONLY_CHECK(targetBankInfo.info.rawBank.tokenSymbol));
  }

  const isBeingRetired =
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Initial, targetBankInfo.info.oraclePrice, true)
      .eq(0) &&
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Maintenance, targetBankInfo.info.oraclePrice)
      .gt(0);
  if (isBeingRetired) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.BANK_RETIRED_CHECK(targetBankInfo.meta.tokenSymbol));
  }

  const isAttemptingToDepositStakedAsset = targetBankInfo.info.rawBank.config.assetTag === 2;
  if (isAttemptingToDepositStakedAsset) {
    checks.push(STATIC_SIMULATION_ERRORS.STAKED_ONLY_DEPOSIT_CHECK);
  }

  const isFull = targetBankInfo.info.rawBank.computeRemainingCapacity().borrowCapacity.lte(0);
  if (isFull && targetBankInfo.info.rawBank.config.assetTag !== 2) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.BORROW_CAPACITY_CHECK(targetBankInfo.meta.tokenSymbol));
  }

  const alreadyLending = targetBankInfo.isActive && targetBankInfo.position.isLending;
  if (alreadyLending) {
    checks.push(STATIC_SIMULATION_ERRORS.ALREADY_LENDING);
  }

  const freeCollateral = marginfiAccount && marginfiAccount.computeFreeCollateral();
  if (!freeCollateral || (freeCollateral && freeCollateral.eq(0))) {
    checks.push(STATIC_SIMULATION_ERRORS.NO_COLLATERAL);
  }

  const existingLiabilityBanks = extendedBankInfos.filter(
    (b) => b.isActive && !b.position.isLending
  ) as ActiveBankInfo[];
  const existingIsolatedBorrow = existingLiabilityBanks.find(
    (b) => b.info.rawBank.config.riskTier === RiskTier.Isolated && !b.address.equals(targetBankInfo.address)
  );
  if (existingIsolatedBorrow) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.EXISTING_ISO_BORROW_CHECK(existingIsolatedBorrow.meta.tokenSymbol));
  }

  const attemptingToBorrowIsolatedAssetWithActiveDebt =
    targetBankInfo.info.rawBank.config.riskTier === RiskTier.Isolated &&
    !marginfiAccount
      ?.computeHealthComponents(MarginRequirementType.Equity, [targetBankInfo.address])
      .liabilities.isZero();
  if (attemptingToBorrowIsolatedAssetWithActiveDebt) {
    checks.push(STATIC_SIMULATION_ERRORS.EXISTING_BORROW);
  }

  if (targetBankInfo && isBankOracleStale(targetBankInfo)) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.STALE_CHECK("Borrows"));
  }

  return checks;
}

function canBeLent(targetBankInfo: ExtendedBankInfo, nativeSolBalance: number): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  const isPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;

  if (isPaused) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.BANK_PAUSED_CHECK(targetBankInfo.meta.tokenSymbol));
  }

  const isReduceOnly = targetBankInfo.info.rawBank.config.operationalState === OperationalState.ReduceOnly;
  if (isReduceOnly) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.REDUCE_ONLY_CHECK(targetBankInfo.meta.tokenSymbol));
  }

  const isBeingRetired =
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Initial, targetBankInfo.info.oraclePrice, true)
      .eq(0) &&
    targetBankInfo.info.rawBank
      .getAssetWeight(MarginRequirementType.Maintenance, targetBankInfo.info.oraclePrice)
      .gt(0);
  if (isBeingRetired) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.BANK_RETIRED_CHECK(targetBankInfo.meta.tokenSymbol));
  }

  const alreadyBorrowing = targetBankInfo.isActive && !targetBankInfo.position.isLending;
  if (alreadyBorrowing) {
    checks.push(STATIC_SIMULATION_ERRORS.ALREADY_BORROWING);
  }

  const isFull = targetBankInfo.info.rawBank.computeRemainingCapacity().depositCapacity.lte(0);
  if (isFull && targetBankInfo.info.rawBank.config.assetTag !== 2) {
    checks.push({
      description: `The ${targetBankInfo.meta.tokenSymbol} bank is at deposit capacity.`,
      isEnabled: false,
    });
  }

  const isWrappedSol = targetBankInfo.info.state.mint.equals(WSOL_MINT);
  const walletBalance = floor(
    isWrappedSol
      ? Math.max(targetBankInfo.userInfo.tokenAccount.balance + nativeSolBalance - FEE_MARGIN, 0)
      : targetBankInfo.userInfo.tokenAccount.balance,
    targetBankInfo.info.state.mintDecimals
  );

  if (walletBalance === 0 && targetBankInfo.info.rawBank.config.assetTag !== 2) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.INSUFFICIENT_BALANCE_CHECK(targetBankInfo.meta.tokenSymbol));
  } else if (walletBalance === 0 && targetBankInfo.info.rawBank.config.assetTag === 2) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.INSUFFICIENT_STAKE_BALANCE_CHECK(targetBankInfo.meta.tokenName));
  }

  return checks;
}

function canBeLstStaked(lstQuoteMeta: QuoteResponseMeta | null): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  if (lstQuoteMeta?.quoteResponse?.priceImpactPct && Number(lstQuoteMeta?.quoteResponse.priceImpactPct) > 0.01) {
    if (lstQuoteMeta?.quoteResponse?.priceImpactPct && Number(lstQuoteMeta?.quoteResponse.priceImpactPct) > 0.05) {
      checks.push(
        DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_ERROR_CHECK(Number(lstQuoteMeta?.quoteResponse.priceImpactPct))
      );
    } else {
      checks.push(
        DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_WARNING_CHECK(Number(lstQuoteMeta?.quoteResponse.priceImpactPct))
      );
    }
  }

  if (!lstQuoteMeta?.quoteResponse) {
    checks.push({ isEnabled: false });
  }

  return checks;
}

function canBeDepositSwapped(
  depositBank: ExtendedBankInfo,
  swapBank: WalletToken | ExtendedBankInfo,
  nativeSolBalance: number
): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  const isPaused = depositBank.info.rawBank.config.operationalState === OperationalState.Paused;

  if (isPaused) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.BANK_PAUSED_CHECK(depositBank.meta.tokenSymbol));
  }

  const isReduceOnly = depositBank.info.rawBank.config.operationalState === OperationalState.ReduceOnly;
  if (isReduceOnly) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.REDUCE_ONLY_CHECK(depositBank.meta.tokenSymbol));
  }

  const isBeingRetired =
    depositBank.info.rawBank.getAssetWeight(MarginRequirementType.Initial, depositBank.info.oraclePrice, true).eq(0) &&
    depositBank.info.rawBank.getAssetWeight(MarginRequirementType.Maintenance, depositBank.info.oraclePrice).gt(0);
  if (isBeingRetired) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.BANK_RETIRED_CHECK(depositBank.meta.tokenSymbol));
  }

  const alreadyBorrowing = depositBank.isActive && !depositBank.position.isLending;
  if (alreadyBorrowing) {
    checks.push(STATIC_SIMULATION_ERRORS.ALREADY_BORROWING);
  }

  const isFull = depositBank.info.rawBank.computeRemainingCapacity().depositCapacity.lte(0);
  if (isFull && depositBank.info.rawBank.config.assetTag !== 2) {
    checks.push({
      description: `The ${depositBank.meta.tokenSymbol} bank is at deposit capacity.`,
      isEnabled: false,
    });
  }

  const swapBankInfo =
    "info" in swapBank
      ? {
          address: swapBank.info.state.mint,
          balance: swapBank.userInfo.tokenAccount.balance,
          decimals: swapBank.info.state.mintDecimals,
          assetTag: swapBank.info.rawBank.config.assetTag,
          symbol: swapBank.meta.tokenSymbol,
          name: swapBank.meta.tokenName,
        }
      : {
          address: swapBank.address,
          balance: swapBank.balance,
          decimals: swapBank.mintDecimals,
          assetTag: 1, // TODO: this ok to assume 1?
          symbol: swapBank.symbol,
          name: swapBank.name,
        };

  const isWrappedSol = swapBankInfo.address.equals(WSOL_MINT);
  const walletBalance = floor(
    isWrappedSol ? Math.max(swapBankInfo.balance + nativeSolBalance - FEE_MARGIN, 0) : swapBankInfo.balance,
    swapBankInfo.decimals
  );

  if (walletBalance === 0 && swapBankInfo.assetTag !== 2) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.INSUFFICIENT_BALANCE_CHECK(swapBankInfo.symbol));
  } else if (walletBalance === 0 && swapBankInfo.assetTag === 2) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.INSUFFICIENT_STAKE_BALANCE_CHECK(swapBankInfo.name));
  }

  return checks;
}
