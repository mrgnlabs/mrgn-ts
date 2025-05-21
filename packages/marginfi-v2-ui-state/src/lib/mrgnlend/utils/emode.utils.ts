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
  const liabilitySet = new Set(activeLiabilities.map((liabilityBank) => liabilityBank.toBase58()));
  const collateralSet = new Set(activeCollateral.map((collateralBank) => collateralBank.toBase58()));

  // 2) Filter only those pairs that actually match both sides
  const possible: EmodePair[] = [];
  for (const pair of emodePairs) {
    if (
      liabilitySet.has(pair.liabilityBank.toBase58()) &&
      pair.collateralBanks.some((collateralBank) => collateralSet.has(collateralBank.toBase58()))
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

interface EmodeImpact {
  status: EmodeImpactStatus;
  resultingPairs: EmodePair[];
  lowestAssetWeight?: BigNumber;
}

interface ActionEmodeImpact {
  borrowImpact?: EmodeImpact;
  supplyImpact?: EmodeImpact;
  repayAllImpact?: EmodeImpact;
  withdrawAllImpact?: EmodeImpact;
}

function computeEmodeImpacts(
  emodePairs: EmodePair[],
  activeLiabilities: PublicKey[],
  activeCollateral: PublicKey[],
  allBanks: PublicKey[]
): Record<string, ActionEmodeImpact> {
  const toKey = (k: PublicKey) => k.toBase58();

  // 1) baseline EMODE state
  const basePairs = getEmodeState(emodePairs, activeLiabilities, activeCollateral);

  // 2) helper to find the minimum assetWeight in a non-empty array
  function minWeight(pairs: EmodePair[]): BigNumber {
    let min = pairs[0].assetWeightMaint;
    for (const p of pairs) {
      if (p.assetWeightMaint.lt(min)) {
        min = p.assetWeightMaint;
      }
    }
    return min;
  }

  // 3) diff helper now using BigNumber comparisons
  function diffState(before: EmodePair[], after: EmodePair[]): EmodeImpactStatus {
    const wasOn = before.length > 0;
    const isOn = after.length > 0;

    if (!wasOn && !isOn) return EmodeImpactStatus.InactiveEmode;
    if (!wasOn && isOn) return EmodeImpactStatus.ActivateEmode;
    if (wasOn && !isOn) return EmodeImpactStatus.RemoveEmode;

    // both ON
    const beforeMin = minWeight(before);
    const afterMin = minWeight(after);

    if (afterMin.lt(beforeMin)) return EmodeImpactStatus.IncreaseEmode;
    if (afterMin.gt(beforeMin)) return EmodeImpactStatus.ReduceEmode;
    return EmodeImpactStatus.ExtendEmode;
  }

  // 4) simulation of one action on one bank
  function simulate(bank: PublicKey, action: "borrow" | "repay" | "supply" | "withdraw"): EmodeImpact {
    let newLiabs = activeLiabilities.slice();
    let newColls = activeCollateral.slice();

    switch (action) {
      case "borrow":
        if (!newLiabs.some((l) => l.equals(bank))) newLiabs.push(bank);
        break;
      case "repay":
        newLiabs = newLiabs.filter((l) => !l.equals(bank));
        break;
      case "supply":
        if (!newColls.some((c) => c.equals(bank))) newColls.push(bank);
        break;
      case "withdraw":
        newColls = newColls.filter((c) => !c.equals(bank));
        break;
    }

    const after = getEmodeState(emodePairs, newLiabs, newColls);
    const status = diffState(basePairs, after);
    const lowest = after.length > 0 ? minWeight(after) : undefined;

    return { status, resultingPairs: after, lowestAssetWeight: lowest };
  }

  // 5) run through every bank
  const result: Record<string, ActionEmodeImpact> = {};
  for (const bank of allBanks) {
    const key = toKey(bank);
    const impact: ActionEmodeImpact = {};

    impact.borrowImpact = simulate(bank, "borrow");
    impact.supplyImpact = simulate(bank, "supply");

    if (activeLiabilities.some((l) => l.equals(bank))) {
      impact.repayAllImpact = simulate(bank, "repay");
    }
    if (activeCollateral.some((c) => c.equals(bank))) {
      impact.withdrawAllImpact = simulate(bank, "withdraw");
    }

    result[key] = impact;
  }

  return result;
}
