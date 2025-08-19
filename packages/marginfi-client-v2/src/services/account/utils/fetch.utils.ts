import { PublicKey } from "@solana/web3.js";

import { BankMetadataMap } from "@mrgnlabs/mrgn-common";

import { MarginfiAccount } from "../../../models/account";
import { Bank } from "../../../models/bank";
import { OraclePrice } from "../../../services/price";
import { MarginfiProgram } from "../../../types";

import { HealthCacheSimulationError, simulateAccountHealthCacheWithFallback } from "../account.service";
import { MarginfiAccountType, MarginfiAccountRaw } from "../types";
import { EmodePair } from "../../bank";
import BigNumber from "bignumber.js";

export const fetchMarginfiAccountAddresses = async (
  program: MarginfiProgram,
  authority: PublicKey,
  group: PublicKey
): Promise<PublicKey[]> => {
  const marginfiAccounts = (
    await program.account.marginfiAccount.all([
      {
        memcmp: {
          bytes: group.toBase58(),
          offset: 8, // marginfiGroup is the first field in the account, so only offset is the discriminant
        },
      },
      {
        memcmp: {
          bytes: authority.toBase58(),
          offset: 8 + 32, // authority is the second field in the account after the authority, so offset by the discriminant and a pubkey
        },
      },
    ])
  ).map((a) => a.publicKey);

  return marginfiAccounts;
};

export const fetchMarginfiAccountData = async (
  program: MarginfiProgram,
  marginfiAccountPk: PublicKey,
  bankMap: Map<string, Bank>,
  oraclePrices: Map<string, OraclePrice>,
  bankMetadataMap: BankMetadataMap,
  emodePairs: EmodePair[]
): Promise<{ marginfiAccount: MarginfiAccountType; error?: HealthCacheSimulationError }> => {
  const marginfiAccountRaw: MarginfiAccountRaw = await program.account.marginfiAccount.fetch(
    marginfiAccountPk,
    "confirmed"
  );
  const marginfiAccount = MarginfiAccount.fromAccountParsed(marginfiAccountPk, marginfiAccountRaw);
  const activeEmodePairs = marginfiAccount.computeActiveEmodePairs(emodePairs);

  // Adjust bank weights based on active emode pairs
  const adjustedBankMap = new Map<string, Bank>();

  if (activeEmodePairs.length === 0) {
    // No active emode pairs, use original bank map
    bankMap.forEach((bank, key) => {
      adjustedBankMap.set(key, bank);
    });
  } else {
    // Find the best weights for each collateral bank across all active emode emodePairs
    const banks: Bank[] = [];
    bankMap.forEach((bank, key) => {
      banks.push(bank);
    });

    const { adjustedBanks } = adjustBankWeightsWithEmodePairs(banks, activeEmodePairs);

    adjustedBanks.forEach((b) => {
      const bankKey = b.address.toBase58();
      adjustedBankMap.set(bankKey, b);
    });
  }

  const marginfiAccountWithCache = await simulateAccountHealthCacheWithFallback({
    program,
    marginfiAccount,
    bankMap: adjustedBankMap,
    oraclePrices,
    bankMetadataMap,
    balances: marginfiAccount.balances,
  });

  return marginfiAccountWithCache;
};

function adjustBankWeightsWithEmodePairs(
  banks: Bank[],
  emodePairs: EmodePair[]
): {
  adjustedBanks: Bank[];
  originalWeights: Record<string, { assetWeightMaint: BigNumber; assetWeightInit: BigNumber }>;
} {
  if (!emodePairs.length) return { adjustedBanks: banks, originalWeights: {} };

  const originalWeights: Record<string, { assetWeightMaint: BigNumber; assetWeightInit: BigNumber }> = {};

  const lowestWeights: Map<string, { assetWeightMaint: BigNumber; assetWeightInit: BigNumber }> = new Map();

  // For each emode pair, find the collateral banks and track their lowest possible weights
  emodePairs.forEach((emodePair) => {
    emodePair.collateralBanks.forEach((collateralBankPk) => {
      const bankPkStr = collateralBankPk.toString();

      // If we haven't seen this bank yet, initialize with current emode pair weights
      if (!lowestWeights.has(bankPkStr)) {
        lowestWeights.set(bankPkStr, {
          assetWeightMaint: emodePair.assetWeightMaint,
          assetWeightInit: emodePair.assetWeightInit,
        });
      } else {
        // If we've seen this bank before, use the lower weights
        const currentLowest = lowestWeights.get(bankPkStr)!;
        lowestWeights.set(bankPkStr, {
          assetWeightMaint: BigNumber.min(currentLowest.assetWeightMaint, emodePair.assetWeightMaint),
          assetWeightInit: BigNumber.min(currentLowest.assetWeightInit, emodePair.assetWeightInit),
        });
      }
    });
  });

  // Make a copy of the banks array to avoid modifying the original array reference
  // but keep the original Bank objects (with their methods intact)
  const adjustedBanks = [...banks];

  // Apply the lowest weights to each bank
  for (const bank of adjustedBanks) {
    const bankPkStr = bank.address.toString();
    const lowestWeight = lowestWeights.get(bankPkStr);

    if (lowestWeight) {
      // Store original weights before modifying
      originalWeights[bankPkStr] = {
        assetWeightMaint: bank.config.assetWeightMaint,
        assetWeightInit: bank.config.assetWeightInit,
      };

      // Apply new weights only if they're higher than current weights
      if (lowestWeight.assetWeightMaint.gt(bank.config.assetWeightMaint)) {
        // Use the emode weight directly since it's already a BigNumber
        bank.config.assetWeightMaint = lowestWeight.assetWeightMaint;
      }

      if (lowestWeight.assetWeightInit.gt(bank.config.assetWeightInit)) {
        // Use the emode weight directly since it's already a BigNumber
        bank.config.assetWeightInit = lowestWeight.assetWeightInit;
      }
    }
  }

  return { adjustedBanks, originalWeights };
}
