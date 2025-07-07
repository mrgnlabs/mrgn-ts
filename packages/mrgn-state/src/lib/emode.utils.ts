import { Bank, EmodePair, EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import BigNumber from "bignumber.js";
import { ExtendedBankInfo } from "../types";

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

export function groupBanksByEmodeTag(banks: ExtendedBankInfo[]) {
  const groupedBanks: Record<EmodeTag, ExtendedBankInfo[]> = {} as Record<EmodeTag, ExtendedBankInfo[]>;

  for (const bank of banks) {
    const emodeTag = bank.info.rawBank.emode.emodeTag;

    if (!groupedBanks[emodeTag]) {
      groupedBanks[emodeTag] = [];
    }

    // Add the bank to its emodeTag group
    groupedBanks[emodeTag].push(bank);
  }

  return groupedBanks;
}

export function groupLiabilityBanksByCollateralBank(banks: ExtendedBankInfo[], emodePairs: EmodePair[]) {
  const bankMap = new Map<string, ExtendedBankInfo>();
  banks.forEach((bank) => {
    bankMap.set(bank.info.rawBank.address.toString(), bank);
  });

  const result: Record<string, { liabilityBank: ExtendedBankInfo; emodePair: EmodePair }[]> = {};

  emodePairs.forEach((emodePair) => {
    const liabilityBankKey = emodePair.liabilityBank.toString();

    const liabilityBank = bankMap.get(liabilityBankKey);

    if (!liabilityBank) {
      console.error(`Liability bank ${liabilityBankKey} referenced in emode pair not found in banks array`);
      return;
    }

    banks.forEach((potentialCollateralBank) => {
      const bankRaw = potentialCollateralBank.info.rawBank;
      const collateralBankKey = bankRaw.address.toString();

      if (bankRaw.address.equals(emodePair.liabilityBank)) {
        return;
      }

      if (potentialCollateralBank.info.state.hasEmode && bankRaw.emode.emodeTag === emodePair.collateralBankTag) {
        if (!result[collateralBankKey]) {
          result[collateralBankKey] = [];
        }

        result[collateralBankKey].push({
          liabilityBank: liabilityBank,
          emodePair,
        });
      }
    });
  });

  return result;
}

export function groupCollateralBanksByLiabilityBank(banks: ExtendedBankInfo[], emodePairs: EmodePair[]) {
  // Create a map of bank PublicKey string to the ExtendedBankInfo
  const bankMap = new Map<string, ExtendedBankInfo>();
  banks.forEach((bank) => {
    bankMap.set(bank.info.rawBank.address.toString(), bank);
  });

  const result: Record<string, { collateralBank: ExtendedBankInfo; emodePair: EmodePair }[]> = {};

  emodePairs.forEach((emodePair) => {
    const liabilityBankKey = emodePair.liabilityBank.toString();

    banks.forEach((potentialCollateralBank) => {
      const bankRaw = potentialCollateralBank.info.rawBank;
      if (bankRaw.address.equals(emodePair.liabilityBank)) {
        return;
      }

      if (potentialCollateralBank.info.state.hasEmode && bankRaw.emode.emodeTag === emodePair.collateralBankTag) {
        if (!result[liabilityBankKey]) {
          result[liabilityBankKey] = [];
        }

        result[liabilityBankKey].push({
          collateralBank: potentialCollateralBank,
          emodePair,
        });
      }
    });

    if (!bankMap.has(liabilityBankKey)) {
      console.error(`Liability bank ${liabilityBankKey} referenced in emode pair not found in banks array`);
    }
  });

  return result;
}
