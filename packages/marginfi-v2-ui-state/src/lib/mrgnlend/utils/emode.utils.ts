import { PublicKey } from "@solana/web3.js";
import { EmodeImpactStatus, EmodePair } from "../types";
import { EmodeTag, MarginfiAccount, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import BigNumber from "bignumber.js";

function getEmodeState(
  emodePairs: EmodePair[],
  activeLiabilities: PublicKey[],
  activeCollateral: PublicKey[]
): EmodePair[] {
  // 1) Turn active lists into O(1) lookups
  const liabilitySet = new Set(activeLiabilities.map((k) => k.toBase58()));
  const collateralSet = new Set(activeCollateral.map((k) => k.toBase58()));

  // 2) Filter only those pairs that actually match both sides
  const possible: EmodePair[] = [];
  for (const pair of emodePairs) {
    if (
      liabilitySet.has(pair.liabilityBank.toBase58()) &&
      pair.collateralBanks.some((b) => collateralSet.has(b.toBase58()))
    ) {
      possible.push(pair);
    }
  }
  if (possible.length === 0) return [];

  // 3) Build a map: collateralTag → set of liabilityTags it supports
  const collatToLiabMap = new Map<string, Set<string>>();
  const allLiabTags = new Set<string>();

  for (const p of possible) {
    const liabTag = p.liabilityBankTag.toString();
    const collTag = p.collateralBankTag.toString();
    allLiabTags.add(liabTag);

    let liabSet = collatToLiabMap.get(collTag);
    if (!liabSet) {
      liabSet = new Set<string>();
      collatToLiabMap.set(collTag, liabSet);
    }
    liabSet.add(liabTag);
  }

  // 4) Check for any collateralTag whose liab-set covers allLiabTags
  const totalLiabs = allLiabTags.size;
  for (const liabSet of collatToLiabMap.values()) {
    if (liabSet.size === totalLiabs) {
      // found one collateralTag that works for every liabilityTag
      return possible;
    }
  }
  return [];
}

/*
 *
 *
 */
function getEmodeRepayImpact(
  emodePairs: EmodePair[],
  marginfiAccount?: MarginfiAccountWrapper | MarginfiAccount | null,
  activeEmodePairs?: EmodePair[]
) {
  // Is emode active right now?
  const repayAllImpactByLiabilityBank: Record<
    string,
    {
      assetWeightMaint: BigNumber;
      assetWeightInit: BigNumber;
      impactStatus: EmodeImpactStatus;
      collateralTags: EmodeTag[];
    }
  > = {};

  // Return if empty account
  if (!marginfiAccount) {
    return repayAllImpactByLiabilityBank;
  }

  // Return if no borrows
  if (!marginfiAccount.activeBalances.some((b) => b.liabilityShares.gt(0))) {
    return repayAllImpactByLiabilityBank;
  }

  // Get all active borrows
  const activeLiabilities = marginfiAccount.activeBalances
    .filter((b) => b.liabilityShares.gt(0))
    .map((balance) => balance.bankPk);

  const activeAssets = marginfiAccount.activeBalances
    .filter((b) => b.assetShares.gt(0))
    .map((balance) => balance.bankPk);

  // check if the user does not have any emodes
  if (!activeEmodePairs || !activeEmodePairs.length) {
    const possiblePairsByLiabilityBank: Record<string, EmodePair[]> = {};

    emodePairs.forEach((pair) => {
      const liabilityBankKey = pair.liabilityBank.toBase58();
      if (!possiblePairsByLiabilityBank[liabilityBankKey]) {
        possiblePairsByLiabilityBank[liabilityBankKey] = [pair];
      } else {
        possiblePairsByLiabilityBank[liabilityBankKey].push(pair);
      }
    });
  } else {
    // the user has emode enabled
    const emodePairByLiabilityBank: Record<string, EmodePair> = {};

    activeEmodePairs.forEach((p) => {
      emodePairByLiabilityBank[p.liabilityBank.toBase58()] = p;
    });

    // check if there are more then one banks preventing emode

    // Find the best (highest) weights
    let maxMaint = activeEmodePairs[0]?.assetWeightMaint;
    let maxInt = activeEmodePairs[0]?.assetWeightInt;

    for (const p of activeEmodePairs) {
      if (p.assetWeightMaint.gt(maxMaint)) maxMaint = p.assetWeightMaint;
      if (p.assetWeightInt.gt(maxInt)) maxInt = p.assetWeightInt;
    }

    //Keep any pair that is lower in *either* metric
    const lowerWeightPairs = activeEmodePairs.filter(
      (p) => p.assetWeightMaint.lt(maxMaint) || p.assetWeightInt.lt(maxInt)
    );

    if (lowerWeightPairs.length === 1) {
      const [outlierPair] = lowerWeightPairs;
      pairByLiabilityBank[outlierPair.liabilityBank.toBase58()] = outlierPair;
    }
  }
  return pairByLiabilityBank;
}
