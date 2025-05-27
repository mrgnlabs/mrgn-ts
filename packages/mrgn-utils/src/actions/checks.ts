import { floor, percentFormatter, WalletToken, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ActionMessageType } from "./types";
import { QuoteResponse } from "@jup-ag/api";
import {
  MarginfiAccountWrapper,
  OperationalState,
  MarginRequirementType,
  RiskTier,
  EmodeImpactStatus,
  EmodeImpact,
} from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, ActiveBankInfo, FEE_MARGIN } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";
import { DYNAMIC_SIMULATION_ERRORS, STATIC_INFO_MESSAGES, STATIC_SIMULATION_ERRORS } from "../errors";
import { ArenaGroupStatus } from "../types";
import { isWholePosition } from "../mrgnUtils";

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
  getTradeSpecificChecks,
};

function canBeWithdrawn(
  targetBankInfo: ExtendedBankInfo,
  marginfiAccount: MarginfiAccountWrapper | null,
  amount: number | null
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

  if (amount && targetBankInfo.userInfo.emodeImpact?.withdrawAllImpact && targetBankInfo.isActive) {
    const isWithdrawingAll = isWholePosition(targetBankInfo, amount);

    if (isWithdrawingAll) {
      const withdrawAllImpact = targetBankInfo.userInfo.emodeImpact?.withdrawAllImpact;
      switch (withdrawAllImpact.status) {
        case EmodeImpactStatus.ActivateEmode:
          checks.push(STATIC_INFO_MESSAGES.EMODE_ACTIVATE_IMPACT);
          break;
        case EmodeImpactStatus.ExtendEmode:
          checks.push(STATIC_INFO_MESSAGES.EMODE_EXTEND_IMPACT);
          break;
        case EmodeImpactStatus.IncreaseEmode:
          checks.push(DYNAMIC_SIMULATION_ERRORS.EMODE_INCREASE_CHECK());
          break;
        case EmodeImpactStatus.ReduceEmode:
          checks.push(DYNAMIC_SIMULATION_ERRORS.EMODE_REDUCE_CHECK());
          break;
        case EmodeImpactStatus.RemoveEmode:
          checks.push(STATIC_SIMULATION_ERRORS.REMOVE_E_MODE_CHECK);
          break;
        case EmodeImpactStatus.InactiveEmode:
          break;
      }
    }
  }

  return checks;
}

function canBeRepaid(
  targetBankInfo: ExtendedBankInfo,
  repayCollatAction: boolean = false,
  amount: number | null
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

  if (targetBankInfo.userInfo.maxRepay === 0) {
    checks.push(DYNAMIC_SIMULATION_ERRORS.SUFFICIENT_LIQ_CHECK(targetBankInfo.meta.tokenSymbol, repayCollatAction));
  }

  if (amount && targetBankInfo.userInfo.emodeImpact?.repayAllImpact && targetBankInfo.isActive) {
    const isRepayingAll = isWholePosition(targetBankInfo, amount);
    const repayAllImpact = targetBankInfo.userInfo.emodeImpact?.repayAllImpact;

    if (isRepayingAll) {
      switch (repayAllImpact.status) {
        case EmodeImpactStatus.ActivateEmode:
          checks.push(STATIC_INFO_MESSAGES.EMODE_ACTIVATE_IMPACT);
          break;
        case EmodeImpactStatus.ExtendEmode:
          checks.push(STATIC_INFO_MESSAGES.EMODE_EXTEND_IMPACT);
          break;
        case EmodeImpactStatus.IncreaseEmode:
          checks.push(DYNAMIC_SIMULATION_ERRORS.EMODE_INCREASE_CHECK());
          break;
        case EmodeImpactStatus.ReduceEmode:
          checks.push(DYNAMIC_SIMULATION_ERRORS.EMODE_REDUCE_CHECK());
          break;
        case EmodeImpactStatus.RemoveEmode:
          checks.push(STATIC_SIMULATION_ERRORS.REMOVE_E_MODE_CHECK);
          break;
        case EmodeImpactStatus.InactiveEmode:
          break;
      }
    }
  }

  return checks;
}

function canBeRepaidCollat(
  targetBankInfo: ExtendedBankInfo,
  repayBankInfo: ExtendedBankInfo | null,
  swapQuote: QuoteResponse | null,
  maxOverflowHit?: boolean
): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  const isTargetBankPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  const isRepayBankPaused = repayBankInfo?.info.rawBank.config.operationalState === OperationalState.Paused;

  if (!swapQuote) {
    checks.push({ isEnabled: false });
  }

  if (!repayBankInfo) {
    checks.push({ isEnabled: false });
  }

  if (isTargetBankPaused || isRepayBankPaused) {
    checks.push(
      DYNAMIC_SIMULATION_ERRORS.BANK_PAUSED_CHECK(
        isTargetBankPaused ? targetBankInfo.info.rawBank.tokenSymbol : repayBankInfo?.info.rawBank.tokenSymbol
      )
    );
  }

  if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.01) {
    if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.05) {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_ERROR_CHECK(Number(swapQuote.priceImpactPct)));
    } else {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_WARNING_CHECK(Number(swapQuote.priceImpactPct)));
    }
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

  // improve this check so it ignores swb oracles
  // if ((repayBankInfo && isBankOracleStale(repayBankInfo)) || (targetBankInfo && isBankOracleStale(targetBankInfo))) {
  //   checks.push(DYNAMIC_SIMULATION_ERRORS.STALE_CHECK("Repayments"));
  // }

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

function getTradeSpecificChecks(
  groupStatus: ArenaGroupStatus, // status of the pool
  tradeState: "long" | "short", // intended action by the user
  borrowBank: ExtendedBankInfo | null,
  depositBank: ExtendedBankInfo | null
): ActionMessageType[] {
  let checks: ActionMessageType[] = [];

  if (groupStatus === ArenaGroupStatus.LP) {
    const providingLpBorrowBank = borrowBank?.isActive && borrowBank?.position.isLending;

    if (providingLpBorrowBank) {
      checks.push({
        isEnabled: false,
        description: `You cannot ${tradeState} while you're providing liquidity for ${borrowBank?.info.rawBank.tokenSymbol}. To proceed, remove your liquidity position for this asset.`,
      });
    } else {
      checks.push({
        isEnabled: true,
        actionMethod: "INFO",
        description: `You're providing liquidity for ${depositBank?.info.rawBank.tokenSymbol}. Keep this in mind when managing your positions.`,
      });
    }
  }

  if (groupStatus === ArenaGroupStatus.LONG || groupStatus === ArenaGroupStatus.SHORT) {
    if (borrowBank?.isActive && borrowBank?.position.isLending) {
      checks.push({
        isEnabled: false,
        description: `You cannot ${tradeState} while you have an active ${
          tradeState === "long" ? "short" : "long"
        } position for this token.`,
      });
    }
  }

  return checks;
}

function canBeLooped(
  targetBankInfo: ExtendedBankInfo,
  repayBankInfo: ExtendedBankInfo | null,
  emodeImpact: EmodeImpact | null,
  swapQuote?: QuoteResponse | null,
  extendedBankInfos?: ExtendedBankInfo[]
): ActionMessageType[] {
  let checks: ActionMessageType[] = [];
  const isTargetBankPaused = targetBankInfo.info.rawBank.config.operationalState === OperationalState.Paused;
  const isRepayBankPaused = repayBankInfo?.info.rawBank.config.operationalState === OperationalState.Paused;

  if (!repayBankInfo) {
    checks.push({ isEnabled: false });
  }

  if (isTargetBankPaused || isRepayBankPaused) {
    checks.push(
      DYNAMIC_SIMULATION_ERRORS.BANK_PAUSED_CHECK(
        isTargetBankPaused ? targetBankInfo.info.rawBank.tokenSymbol : repayBankInfo?.info.rawBank.tokenSymbol
      )
    );
  }

  if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.01) {
    if (swapQuote?.priceImpactPct && Number(swapQuote.priceImpactPct) > 0.05) {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_ERROR_CHECK(Number(swapQuote.priceImpactPct)));
    } else {
      checks.push(DYNAMIC_SIMULATION_ERRORS.PRICE_IMPACT_WARNING_CHECK(Number(swapQuote.priceImpactPct)));
    }
  }

  // improve this check so it ignores swb oracles
  // if ((repayBankInfo && isBankOracleStale(repayBankInfo)) || (targetBankInfo && isBankOracleStale(targetBankInfo))) {
  //   checks.push(DYNAMIC_SIMULATION_ERRORS.STALE_CHECK("Looping"));
  // }

  if (extendedBankInfos && extendedBankInfos.some((bank) => bank.isActive && bank.info.rawBank.config.assetTag === 2)) {
    checks.push(STATIC_SIMULATION_ERRORS.STAKED_ONLY_SOL_CHECK);
  }

  if (emodeImpact) {
    switch (emodeImpact.status) {
      case EmodeImpactStatus.ActivateEmode:
        checks.push(STATIC_INFO_MESSAGES.EMODE_ACTIVATE_IMPACT);
        break;
      case EmodeImpactStatus.ExtendEmode:
        checks.push(STATIC_INFO_MESSAGES.EMODE_EXTEND_IMPACT);
        break;
      case EmodeImpactStatus.IncreaseEmode:
        checks.push(DYNAMIC_SIMULATION_ERRORS.EMODE_INCREASE_CHECK());
        break;
      case EmodeImpactStatus.ReduceEmode:
        checks.push(DYNAMIC_SIMULATION_ERRORS.EMODE_REDUCE_CHECK());
        break;
      case EmodeImpactStatus.RemoveEmode:
        checks.push(STATIC_SIMULATION_ERRORS.REMOVE_E_MODE_CHECK);
        break;
      case EmodeImpactStatus.InactiveEmode:
        break;
    }
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

  if (targetBankInfo.userInfo.emodeImpact?.borrowImpact) {
    const borrowImpact = targetBankInfo.userInfo.emodeImpact?.borrowImpact;

    switch (borrowImpact.status) {
      case EmodeImpactStatus.ActivateEmode:
        checks.push(STATIC_INFO_MESSAGES.EMODE_ACTIVATE_IMPACT);
        break;
      case EmodeImpactStatus.ExtendEmode:
        checks.push(STATIC_INFO_MESSAGES.EMODE_EXTEND_IMPACT);
        break;
      case EmodeImpactStatus.IncreaseEmode:
        checks.push(DYNAMIC_SIMULATION_ERRORS.EMODE_INCREASE_CHECK());
        break;
      case EmodeImpactStatus.ReduceEmode:
        checks.push(DYNAMIC_SIMULATION_ERRORS.EMODE_REDUCE_CHECK());
        break;
      case EmodeImpactStatus.RemoveEmode:
        checks.push(STATIC_SIMULATION_ERRORS.REMOVE_E_MODE_CHECK);
        break;
      case EmodeImpactStatus.InactiveEmode:
        break;
    }
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

  if (targetBankInfo.userInfo.emodeImpact?.supplyImpact) {
    const supplyImpact = targetBankInfo.userInfo.emodeImpact?.supplyImpact;

    switch (supplyImpact.status) {
      case EmodeImpactStatus.ActivateEmode:
        checks.push(STATIC_INFO_MESSAGES.EMODE_ACTIVATE_IMPACT);
        break;
      case EmodeImpactStatus.ExtendEmode:
        checks.push(STATIC_INFO_MESSAGES.EMODE_EXTEND_IMPACT);
        break;
      case EmodeImpactStatus.IncreaseEmode:
        checks.push(DYNAMIC_SIMULATION_ERRORS.EMODE_INCREASE_CHECK());
        break;
      case EmodeImpactStatus.ReduceEmode:
        checks.push(DYNAMIC_SIMULATION_ERRORS.EMODE_REDUCE_CHECK());
        break;
      case EmodeImpactStatus.RemoveEmode:
        checks.push(STATIC_SIMULATION_ERRORS.REMOVE_E_MODE_CHECK);
        break;
      case EmodeImpactStatus.InactiveEmode:
        break;
    }
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
