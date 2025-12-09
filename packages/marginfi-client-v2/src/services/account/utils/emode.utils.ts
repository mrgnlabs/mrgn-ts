import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { EmodePair, ActionEmodeImpact, EmodeImpactStatus, EmodeImpact, ActiveEmodePair, EmodeTag } from "../../bank";

export function computeEmodeImpacts(
  emodePairs: EmodePair[],
  activeLiabilities: PublicKey[],
  activeCollateral: PublicKey[],
  allBanks: PublicKey[]
): Record<string, ActionEmodeImpact> {
  const toKey = (k: PublicKey) => k.toBase58();

  // Baseline state
  const basePairs = computeActiveEmodePairs(emodePairs, activeLiabilities, activeCollateral);
  const baseOn = basePairs.length > 0;

  // Liability tag map & existing tags
  const liabTagMap = new Map<string, string>();
  for (const p of emodePairs) {
    liabTagMap.set(p.liabilityBank.toBase58(), p.liabilityBankTag.toString());
  }
  const existingTags = new Set<string>(
    activeLiabilities.map((l) => liabTagMap.get(l.toBase58())).filter((t): t is string => !!t)
  );

  // Helper for min initial weight (used in diffState only)
  function minWeight(ps: EmodePair[]): BigNumber {
    // TODO: handle empty array
    let m = ps[0]!.assetWeightInit;
    for (const x of ps) if (x.assetWeightInit.lt(m)) m = x.assetWeightInit;
    return m;
  }

  // Determine status transitions
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

  // Simulation of each action
  function simulate(bank: PublicKey, action: "borrow" | "repay" | "supply" | "withdraw"): EmodeImpact {
    const isSolBank = bank.equals(new PublicKey("CCKtUs6Cgwo4aaQUmBPmyoApH2gUDErxNZCAntD6LYGh"));

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

    const after = computeActiveEmodePairs(emodePairs, L, C);
    let status = diffState(basePairs, after);

    // Borrow override
    if (action === "borrow") {
      const tag = liabTagMap.get(bank.toBase58());

      // Borrowing an unconfigured bank => EMODE off / inactive
      if (!tag) {
        status = baseOn ? EmodeImpactStatus.RemoveEmode : EmodeImpactStatus.InactiveEmode;

        // EMODE was ON; keep the diffState result unless EMODE really turns OFF
      } else if (baseOn) {
        if (after.length === 0) {
          status = EmodeImpactStatus.RemoveEmode;
        } else if (existingTags.has(tag)) {
          status = EmodeImpactStatus.ExtendEmode; // same tag ⇒ extend
          // else keep diffState (Increase/Reduce) which is already correct
        }
      }
    }

    // Supply override
    if (action === "supply") {
      const isOn = after.length > 0;
      status =
        !baseOn && isOn
          ? EmodeImpactStatus.ActivateEmode
          : baseOn && isOn
            ? EmodeImpactStatus.ExtendEmode
            : EmodeImpactStatus.InactiveEmode;
    }

    // Withdraw override
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

    // Find the pair with lowest assetWeightInit and grab its maint weight
    let bestPair: EmodePair | undefined;
    if (after.length > 0) {
      bestPair = after[0]!;
      for (const p of after) {
        if (p.assetWeightInit.lt(bestPair.assetWeightInit)) {
          bestPair = p;
        }
      }
    }

    const activeEmodePair: ActiveEmodePair | undefined = bestPair
      ? {
          collateralBanks: Array.from(
            new Map(
              after
                .map((p) => p.collateralBanks)
                .flat()
                .map((bank) => [bank.toBase58(), bank])
            ).values()
          ),
          collateralBankTags: Array.from(new Set(after.map((p) => p.collateralBankTag).flat())),
          liabilityBanks: Array.from(
            new Map(
              after
                .map((p) => p.liabilityBank)
                .flat()
                .map((bank) => [bank.toBase58(), bank])
            ).values()
          ),
          liabilityBankTags: Array.from(new Set(after.map((p) => p.liabilityBankTag).flat())),
          assetWeightMaint: bestPair.assetWeightMaint,
          assetWeightInit: bestPair.assetWeightInit,
        }
      : undefined;

    return {
      status,
      resultingPairs: after,
      activePair: activeEmodePair,
    };
  }

  // Run simulations across allBanks
  const result: Record<string, ActionEmodeImpact> = {};
  for (const bank of allBanks) {
    const key = toKey(bank);
    const impact: ActionEmodeImpact = {};

    // Only new borrows
    if (!activeCollateral.some((x) => x.equals(bank))) {
      impact.borrowImpact = simulate(bank, "borrow");
    }

    // Only supply for collateral-configured banks not in play
    const collSet = new Set(emodePairs.flatMap((p) => p.collateralBanks.map((c) => c.toBase58())));
    if (
      collSet.has(key) &&
      !activeCollateral.some((x) => x.equals(bank)) &&
      !activeLiabilities.some((x) => x.equals(bank))
    ) {
      impact.supplyImpact = simulate(bank, "supply");
    }

    if (activeLiabilities.some((x) => x.equals(bank))) {
      impact.repayAllImpact = simulate(bank, "repay");
    }
    if (activeCollateral.some((x) => x.equals(bank))) {
      impact.withdrawAllImpact = simulate(bank, "withdraw");
    }

    result[key] = impact;
  }

  return result;
}

export function computeActiveEmodePairs(
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

  // 5) Find all groups whose liability-tags cover _every_ requiredTag
  const validGroups: EmodePair[][] = [];
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
      validGroups.push(group);
    }
  }

  // 6) Return all valid groups flattened (selection happens elsewhere)
  if (validGroups.length === 0) return [];

  // Flatten all valid groups into a single array
  return validGroups.flat();
}
