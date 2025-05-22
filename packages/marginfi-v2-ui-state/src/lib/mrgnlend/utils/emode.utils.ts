import { PublicKey } from "@solana/web3.js";
import { EmodeImpactStatus, EmodePair } from "../types";
import { EmodeTag, MarginfiAccount, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import BigNumber from "bignumber.js";

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

  return computeEmodeImpacts(emodePairs, activeLiabilities, activeCollateral, banks);
}

function getEmodeState(
  emodePairs: EmodePair[],
  activeLiabilities: PublicKey[],
  activeCollateral: PublicKey[]
): EmodePair[] {
  // 1) Drop any pairs with an “unset” tag (0)
  const configured = emodePairs.filter(
    (p) => p.collateralBankTag !== EmodeTag.UNSET && p.liabilityBankTag !== EmodeTag.UNSET
  );

  // 2) Build the set of required liability‐tags from _all_ active liabilities
  //    If any liability has no configured entry at all, EMODE is off.
  const liabTagByBank = new Map<string, string>();
  for (const p of configured) {
    liabTagByBank.set(p.liabilityBank.toBase58(), p.liabilityBankTag.toString());
  }
  const requiredTags = new Set<string>();
  for (const liab of activeLiabilities) {
    const tag = liabTagByBank.get(liab.toBase58());
    if (!tag) {
      // a liability with no entries kills EMODE immediately
      return [];
    }
    requiredTags.add(tag);
  }

  // 3) Of those configured pairs, keep only ones touching both an active liability AND collateral
  const possible = configured.filter(
    (p) =>
      activeLiabilities.some((l) => l.equals(p.liabilityBank)) &&
      p.collateralBanks.some((c) => activeCollateral.some((a) => a.equals(c)))
  );
  if (possible.length === 0) return [];

  // 4) Group by collateral-tag
  const byCollTag: Record<string, EmodePair[]> = {};
  for (const p of possible) {
    const ct = p.collateralBankTag.toString();
    (byCollTag[ct] ||= []).push(p);
  }

  // 5) Return the group whose liability-tags cover _every_ requiredTag
  for (const group of Object.values(byCollTag)) {
    const supports = new Set(group.map((p) => p.liabilityBankTag.toString()));
    let coversAll = true;
    for (const rt of requiredTags) {
      if (!supports.has(rt)) {
        coversAll = false;
        break;
      }
    }
    if (coversAll) {
      return group;
    }
  }

  // 6) Nothing can cover all liabilities → EMODE off
  return [];
}

function computeEmodeImpacts(
  emodePairs: EmodePair[],
  activeLiabilities: PublicKey[],
  activeCollateral: PublicKey[],
  allBanks: PublicKey[]
): Record<string, ActionEmodeImpact> {
  const toKey = (k: PublicKey) => k.toBase58();

  // ─── Baseline state ───
  const basePairs = getEmodeState(emodePairs, activeLiabilities, activeCollateral);
  const baseOn = basePairs.length > 0;

  // ─── Liability tag map & existing tags ───
  const liabTagMap = new Map<string, string>();
  for (const p of emodePairs) {
    liabTagMap.set(p.liabilityBank.toBase58(), p.liabilityBankTag.toString());
  }
  const existingTags = new Set<string>(
    activeLiabilities.map((l) => liabTagMap.get(l.toBase58())).filter((t): t is string => !!t)
  );

  // ─── Helpers ───
  function minWeight(ps: EmodePair[]): BigNumber {
    let m = ps[0].assetWeightInt;
    for (const x of ps) if (x.assetWeightInt.lt(m)) m = x.assetWeightInt;
    return m;
  }
  function diffState(before: EmodePair[], after: EmodePair[]): EmodeImpactStatus {
    const was = before.length > 0,
      isOn = after.length > 0;
    if (!was && !isOn) return EmodeImpactStatus.InactiveEmode;
    if (!was && isOn) return EmodeImpactStatus.ActivateEmode;
    if (was && !isOn) return EmodeImpactStatus.RemoveEmode;

    const bMin = minWeight(before),
      aMin = minWeight(after);
    if (aMin.gt(bMin)) return EmodeImpactStatus.IncreaseEmode;
    if (aMin.lt(bMin)) return EmodeImpactStatus.ReduceEmode;
    return EmodeImpactStatus.ExtendEmode;
  }

  // ─── Simulation ───
  function simulate(bank: PublicKey, action: "borrow" | "repay" | "supply" | "withdraw"): EmodeImpact {
    let L = [...activeLiabilities],
      C = [...activeCollateral];
    switch (action) {
      case "borrow":
        if (!L.some((x) => x.equals(bank))) L.push(bank);
        break;
      case "repay":
        L = L.filter((x) => !x.equals(bank));
        break;
      case "supply":
        if (!C.some((x) => x.equals(bank))) C.push(bank);
        break;
      case "withdraw":
        C = C.filter((x) => !x.equals(bank));
        break;
    }

    const after = getEmodeState(emodePairs, L, C);
    let status = diffState(basePairs, after);

    // borrow override
    if (action === "borrow") {
      const tag = liabTagMap.get(bank.toBase58());
      if (!tag) {
        status = baseOn ? EmodeImpactStatus.RemoveEmode : EmodeImpactStatus.InactiveEmode;
      } else if (baseOn) {
        status = existingTags.has(tag) ? EmodeImpactStatus.ExtendEmode : EmodeImpactStatus.RemoveEmode;
      }
    }

    // supply override
    if (action === "supply") {
      const isOn = after.length > 0;
      status =
        !baseOn && isOn
          ? EmodeImpactStatus.ActivateEmode
          : baseOn && isOn
            ? EmodeImpactStatus.ExtendEmode
            : EmodeImpactStatus.InactiveEmode;
    }

    // withdraw override
    if (action === "withdraw") {
      if (!baseOn) {
        status = EmodeImpactStatus.InactiveEmode;
      } else if (after.length === 0) {
        status = EmodeImpactStatus.RemoveEmode;
      } else {
        const b = minWeight(basePairs),
          a = minWeight(after);
        if (a.gt(b)) status = EmodeImpactStatus.IncreaseEmode;
        else if (a.lt(b)) status = EmodeImpactStatus.ReduceEmode;
        else status = EmodeImpactStatus.ExtendEmode;
      }
    }

    const lowest = after.length > 0 ? minWeight(after) : undefined;
    return { status, resultingPairs: after, lowestAssetWeight: lowest };
  }

  // ─── NEW: build the set of all collateral‐eligible banks ───
  const collateralSet = new Set<string>();
  emodePairs.forEach((p) => {
    if (p.collateralBankTag !== EmodeTag.UNSET && p.liabilityBankTag !== EmodeTag.UNSET) {
      p.collateralBanks.forEach((c) => collateralSet.add(c.toBase58()));
    }
  });

  const result: Record<string, ActionEmodeImpact> = {};
  for (const bank of allBanks) {
    const key = toKey(bank);
    const imp: ActionEmodeImpact = {};

    // 1) borrowImpact: as before, but guard out any active positions
    if (!activeLiabilities.some((l) => l.equals(bank)) && !activeCollateral.some((c) => c.equals(bank))) {
      imp.borrowImpact = simulate(bank, "borrow");
    }

    // 2) supplyImpact: *only* for collateral‐configured banks **and** not already in play
    if (
      collateralSet.has(key) &&
      !activeCollateral.some((c) => c.equals(bank)) &&
      !activeLiabilities.some((l) => l.equals(bank))
    ) {
      imp.supplyImpact = simulate(bank, "supply");
    }

    // 3) repayAll/withdrawAll: unchanged
    if (activeLiabilities.some((l) => l.equals(bank))) {
      imp.repayAllImpact = simulate(bank, "repay");
    }
    if (activeCollateral.some((c) => c.equals(bank))) {
      imp.withdrawAllImpact = simulate(bank, "withdraw");
    }

    result[key] = imp;
  }

  return result;
}
