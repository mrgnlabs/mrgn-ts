import { PublicKey } from "@solana/web3.js";
import { EmodeImpactStatus, EmodePair } from "../types";
import { EmodeTag, MarginfiAccount, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import BigNumber from "bignumber.js";

export function getEmodeState(
  emodePairs: EmodePair[],
  activeLiabilities: PublicKey[],
  activeCollateral: PublicKey[]
): EmodePair[] {
  // 1) quickly filter to pairs that touch at least one active liability AND one active collateral
  const possible: EmodePair[] = emodePairs.filter((pair) => {
    const hasLiab = activeLiabilities.some((l) => l.equals(pair.liabilityBank));
    const hasColl = pair.collateralBanks.some((c) => activeCollateral.some((a) => a.equals(c)));
    return hasLiab && hasColl;
  });
  if (possible.length === 0) return [];

  // 2) group by collateral‐tag, track all liability tags
  const byCollTag: Record<string, EmodePair[]> = {};
  const liabTags = new Set<string>();
  for (const p of possible) {
    const collTag = p.collateralBankTag.toString();
    byCollTag[collTag] = byCollTag[collTag] || [];
    byCollTag[collTag].push(p);
    liabTags.add(p.liabilityBankTag.toString());
  }
  const allLiabTags = Array.from(liabTags);

  // 3) find a collateral tag that covers every liability tag, and return only its pairs
  for (const [collTag, pairs] of Object.entries(byCollTag)) {
    const supports = new Set(pairs.map((p) => p.liabilityBankTag.toString()));
    if (allLiabTags.every((tag) => supports.has(tag))) {
      return pairs;
    }
  }

  // 4) no single collateral tag can handle all liabilities → EMODE off
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

export function computeEmodeImpactsAccount(
  emodePairs: EmodePair[],
  banks: PublicKey[],
  marginfiAccount?: MarginfiAccountWrapper | null
) {
  if (!marginfiAccount) return {};

  const activeLiabilities = marginfiAccount.activeBalances
    .filter((balance) => balance.liabilityShares.gt(0))
    .map((balance) => balance.bankPk);
  const activeCollateral = marginfiAccount.activeBalances
    .filter((balance) => balance.assetShares.gt(0))
    .map((balance) => balance.bankPk);

  const doesThis = getEmodeState(emodePairs, activeLiabilities, activeCollateral);
  console.log("doesThis", doesThis);
  return computeEmodeImpacts(emodePairs, activeLiabilities, activeCollateral, banks);
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
  const baseOn = basePairs.length > 0;

  // 2) map each liability bank to its emode tag
  const liabTagMap = new Map<string, string>();
  for (const p of emodePairs) {
    liabTagMap.set(p.liabilityBank.toBase58(), p.liabilityBankTag.toString());
  }

  // 3) set of tags currently borrowed
  const existingTags = new Set<string>(
    activeLiabilities.map((l) => liabTagMap.get(l.toBase58())).filter((t): t is string => !!t)
  );

  // 4) helper to find minimum BigNumber weight
  function minWeight(pairs: EmodePair[]): BigNumber {
    let m = pairs[0].assetWeightInt;
    for (const p of pairs) {
      if (p.assetWeightInt.lt(m)) m = p.assetWeightInt;
    }
    return m;
  }

  // 5) generic diff for repay/borrow (off→on, on→off, weight changes)
  function diffState(before: EmodePair[], after: EmodePair[]): EmodeImpactStatus {
    const wasOn = before.length > 0;
    const isOn = after.length > 0;
    if (!wasOn && !isOn) return EmodeImpactStatus.InactiveEmode;
    if (!wasOn && isOn) return EmodeImpactStatus.ActivateEmode;
    if (wasOn && !isOn) return EmodeImpactStatus.RemoveEmode;

    // both on → compare worst-case weights
    const bMin = minWeight(before);
    const aMin = minWeight(after);
    if (aMin.gt(bMin)) return EmodeImpactStatus.IncreaseEmode;
    if (aMin.lt(bMin)) return EmodeImpactStatus.ReduceEmode;
    return EmodeImpactStatus.ExtendEmode;
  }

  // 6) simulate one action
  function simulate(bank: PublicKey, action: "borrow" | "repay" | "supply" | "withdraw"): EmodeImpact {
    let newLiabs = [...activeLiabilities];
    let newColls = [...activeCollateral];

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
    let status = diffState(basePairs, after);

    // ─── borrow overrides ───
    if (action === "borrow") {
      const key = bank.toBase58();
      const bankTag = liabTagMap.get(key);

      // non-EMODE bank always kills EMODE
      if (!bankTag) {
        status = baseOn ? EmodeImpactStatus.RemoveEmode : EmodeImpactStatus.InactiveEmode;

        // if EMODE is on, only same-tag new borrow keeps it
      } else if (baseOn) {
        status = existingTags.has(bankTag) ? EmodeImpactStatus.ExtendEmode : EmodeImpactStatus.RemoveEmode;
      }
      // if EMODE was off, leave the diffState result (possibly ActivateEmode)
    }

    // ─── supply overrides ───
    if (action === "supply") {
      const isOn = after.length > 0;
      status =
        !baseOn && isOn
          ? EmodeImpactStatus.ActivateEmode
          : baseOn && isOn
            ? EmodeImpactStatus.ExtendEmode
            : EmodeImpactStatus.InactiveEmode;
    }

    // ─── withdraw overrides ───
    if (action === "withdraw") {
      const isOn = after.length > 0;
      status =
        baseOn && !isOn
          ? EmodeImpactStatus.RemoveEmode
          : baseOn && isOn
            ? EmodeImpactStatus.ExtendEmode
            : EmodeImpactStatus.InactiveEmode;
    }

    const lowest = after.length > 0 ? minWeight(after) : undefined;
    return { status, resultingPairs: after, lowestAssetWeight: lowest };
  }

  // 7) run simulations for each bank
  const result: Record<string, ActionEmodeImpact> = {};
  for (const bank of allBanks) {
    const key = toKey(bank);
    const impact: ActionEmodeImpact = {};

    // only simulate new borrows
    if (!activeLiabilities.some((l) => l.equals(bank))) {
      impact.borrowImpact = simulate(bank, "borrow");
    }

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
