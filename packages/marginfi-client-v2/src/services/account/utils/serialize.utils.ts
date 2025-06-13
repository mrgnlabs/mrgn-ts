import BN from "bn.js";

import {
  AccountFlags,
  BalanceType,
  BalanceTypeDto,
  HealthCacheType,
  HealthCacheTypeDto,
  MarginfiAccountType,
  MarginfiAccountTypeDto,
} from "../types";

/**
 * Convert numeric flag to BN for Solana compatibility
 */
export function accountFlagToBN(flag: AccountFlags): BN {
  return new BN(flag);
}

export function marginfiAccountToDto(marginfiAccount: MarginfiAccountType): MarginfiAccountTypeDto {
  return {
    address: marginfiAccount.address.toBase58(),
    group: marginfiAccount.group.toBase58(),
    authority: marginfiAccount.authority.toBase58(),
    balances: marginfiAccount.balances.map(balanceToDto),
    accountFlags: marginfiAccount.accountFlags,
    emissionsDestinationAccount: marginfiAccount.emissionsDestinationAccount.toBase58(),
    healthCache: healthCacheToDto(marginfiAccount.healthCache),
  };
}

export function balanceToDto(balance: BalanceType): BalanceTypeDto {
  return {
    active: balance.active,
    bankPk: balance.bankPk.toBase58(),
    assetShares: balance.assetShares.toString(),
    liabilityShares: balance.liabilityShares.toString(),
    emissionsOutstanding: balance.emissionsOutstanding.toString(),
    lastUpdate: balance.lastUpdate,
  };
}

export function healthCacheToDto(healthCache: HealthCacheType): HealthCacheTypeDto {
  return {
    assetValue: healthCache.assetValue.toString(),
    liabilityValue: healthCache.liabilityValue.toString(),
    assetValueMaint: healthCache.assetValueMaint.toString(),
    liabilityValueMaint: healthCache.liabilityValueMaint.toString(),
    assetValueEquity: healthCache.assetValueEquity.toString(),
    liabilityValueEquity: healthCache.liabilityValueEquity.toString(),
    timestamp: healthCache.timestamp.toString(),
    flags: healthCache.flags,
    prices: healthCache.prices,
    simulationFailed: healthCache.simulationFailed,
  };
}
