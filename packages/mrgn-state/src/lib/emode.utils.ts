import { Bank, EmodePair, EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import BigNumber from "bignumber.js";

export function getEmodePairs(banks: Bank[]) {
  const emodePairs: EmodePair[] = [];

  banks.forEach((bank) => {
    const emodeTag = bank.emode.emodeTag;

    if (emodeTag === EmodeTag.UNSET) {
      return;
    }

    bank.emode.emodeEntries.forEach((emodeEntry) => {
      emodePairs.push({
        collateralBanks: banks
          .filter((bank) => bank.emode.emodeTag === emodeEntry.collateralBankEmodeTag)
          .map((bank) => bank.address),
        collateralBankTag: emodeEntry.collateralBankEmodeTag,
        liabilityBank: bank.address,
        liabilityBankTag: emodeTag,
        assetWeightMaint: emodeEntry.assetWeightMaint,
        assetWeightInit: emodeEntry.assetWeightInit,
      });
    });
  });

  return emodePairs;
}

export function adjustBankWeightsWithEmodePairs(
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
