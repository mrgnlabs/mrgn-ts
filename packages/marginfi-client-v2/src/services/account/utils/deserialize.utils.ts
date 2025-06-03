import BN from "bn.js";
import { AccountFlags, BalanceRaw, BalanceType, HealthCacheFlags, MarginfiAccountRaw } from "../types";
import { BorshCoder } from "@coral-xyz/anchor";
import { MarginfiIdlType } from "../../../idl";
import { AccountType } from "../../../types";
import { PublicKey } from "@solana/web3.js";
import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { Balance } from "../../../models/balance";
import { HealthCache } from "../../../models/health-cache";

export function decodeAccountRaw(encoded: Buffer, idl: MarginfiIdlType): MarginfiAccountRaw {
  const coder = new BorshCoder(idl);
  return coder.accounts.decode(AccountType.MarginfiAccount, encoded);
}

export function parseBalanceRaw(balanceRaw: BalanceRaw): BalanceType {
  const active = typeof balanceRaw.active === "number" ? balanceRaw.active === 1 : balanceRaw.active;
  const bankPk = balanceRaw.bankPk;
  const assetShares = wrappedI80F48toBigNumber(balanceRaw.assetShares);
  const liabilityShares = wrappedI80F48toBigNumber(balanceRaw.liabilityShares);
  const emissionsOutstanding = wrappedI80F48toBigNumber(balanceRaw.emissionsOutstanding);
  const lastUpdate = balanceRaw.lastUpdate.toNumber();

  return {
    active,
    bankPk,
    assetShares,
    liabilityShares,
    emissionsOutstanding,
    lastUpdate,
  };
}

export function parseMarginfiAccountRaw(marginfiAccountPk: PublicKey, accountData: MarginfiAccountRaw) {
  const address = marginfiAccountPk;
  const group = accountData.group;
  const authority = accountData.authority;
  const balances = accountData.lendingAccount.balances.map(Balance.from);
  const accountFlags = getActiveAccountFlags(accountData.accountFlags);
  const emissionsDestinationAccount = accountData.emissionsDestinationAccount;
  const healthCache = HealthCache.from(accountData.healthCache);

  return {
    address,
    group,
    authority,
    balances,
    accountFlags,
    emissionsDestinationAccount,
    healthCache,
  };
}

/**
 * Get all active account flags as an array of flag names
 */
export function getActiveAccountFlags(flags: BN): AccountFlags[] {
  const activeFlags: AccountFlags[] = [];

  Object.keys(AccountFlags)
    .filter((key) => isNaN(Number(key))) // Only get the string keys (not the reverse mapping)
    .forEach((key) => {
      const flag = AccountFlags[key as keyof typeof AccountFlags];
      if (typeof flag === "number" && hasAccountFlag(flags, flag)) {
        activeFlags.push(flag);
      }
    });

  return activeFlags;
}

/**
 * Check if an account flag is set
 */
export function hasAccountFlag(flags: BN, flag: number): boolean {
  return !flags.and(new BN(flag)).isZero();
}

/**
 * Convert on-chain health cache flags (BN) to an array of HealthCacheFlags enum values
 *
 * According to the IDL, health cache flags are defined as:
 * - HEALTHY = 1 (bit 0) - If set, the account cannot be liquidated
 * - ENGINE_STATUS_OK = 2 (bit 1) - If set, the engine did not error during health calculation
 * - ORACLE_OK = 4 (bit 2) - If set, the engine did not encounter oracle issues
 */
export function getActiveHealthCacheFlags(flags: number): HealthCacheFlags[] {
  const activeFlags: HealthCacheFlags[] = [];

  // Check each flag bit
  if (hasHealthCacheFlag(flags, HealthCacheFlags.HEALTHY)) {
    activeFlags.push(HealthCacheFlags.HEALTHY);
  }

  if (hasHealthCacheFlag(flags, HealthCacheFlags.ENGINE_STATUS_OK)) {
    activeFlags.push(HealthCacheFlags.ENGINE_STATUS_OK);
  }

  if (hasHealthCacheFlag(flags, HealthCacheFlags.ORACLE_OK)) {
    activeFlags.push(HealthCacheFlags.ORACLE_OK);
  }

  return activeFlags;
}

/**
 * Check if a health cache flag is set
 */
export function hasHealthCacheFlag(flags: number, flag: HealthCacheFlags): boolean {
  return (flags & flag) !== 0;
}

/**
 * Convert numeric health cache flags to a human-readable status message
 */
export function getHealthCacheStatusDescription(flags: number): string {
  const activeFlags = getActiveHealthCacheFlags(flags);

  // Check for critical conditions first
  if (!activeFlags.includes(HealthCacheFlags.HEALTHY)) {
    return "UNHEALTHY: Account is eligible for liquidation";
  }

  if (!activeFlags.includes(HealthCacheFlags.ENGINE_STATUS_OK)) {
    return "ERROR: Risk engine encountered an error during health calculation";
  }

  if (!activeFlags.includes(HealthCacheFlags.ORACLE_OK)) {
    return "WARNING: Oracle price data may be stale or invalid";
  }

  // All good
  if (activeFlags.length === 3) {
    return "HEALTHY: Account is in good standing";
  }

  // Default case (shouldn't happen often)
  return `Status flags: ${activeFlags.join(", ")}`;
}
