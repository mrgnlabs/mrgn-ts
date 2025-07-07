import { AccountFlags, HealthCacheFlags } from "./account.types";

export interface BalanceTypeDto {
  active: boolean;
  bankPk: string;
  assetShares: string;
  liabilityShares: string;
  emissionsOutstanding: string;
  lastUpdate: number;
}

export interface HealthCacheTypeDto {
  assetValue: string;
  liabilityValue: string;
  assetValueMaint: string;
  liabilityValueMaint: string;
  assetValueEquity: string;
  liabilityValueEquity: string;
  timestamp: string;
  flags: HealthCacheFlags[];
  prices: number[][];
  simulationFailed?: boolean;
}

export interface MarginfiAccountTypeDto {
  address: string;
  group: string;
  authority: string;
  balances: BalanceTypeDto[];
  accountFlags: AccountFlags[];
  emissionsDestinationAccount: string;
  healthCache: HealthCacheTypeDto;
}
