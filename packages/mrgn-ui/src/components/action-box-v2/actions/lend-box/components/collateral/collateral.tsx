import React from "react";

import { Bank, EmodeImpact, MarginfiAccountWrapper, MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";

import { ActionSummary } from "~/components/action-box-v2/utils";
import { ActionProgressBar, ActionProgressBarSkeleton } from "~/components/action-box-v2/components";

type CollateralProps = {
  selectedAccount: MarginfiAccountWrapper | null;
  emodeImpact?: EmodeImpact;
  actionSummary?: ActionSummary;
};

export const Collateral = ({ selectedAccount, emodeImpact, actionSummary }: CollateralProps) => {
  const availableCollateral = React.useMemo(() => {
    if (!selectedAccount) return null;

    if (actionSummary?.simulationPreview?.availableCollateral) {
      return actionSummary.simulationPreview.availableCollateral;
    }

    if (emodeImpact?.activePair) {
      const banks = selectedAccount.client.banks;
      const modifiedBanks = new Map(banks);
      const activePair = emodeImpact.activePair;
      const collateralTags = activePair.collateralBankTags;

      const oraclePrices = selectedAccount.client.oraclePrices;

      banks.forEach((existingBank, bankKey) => {
        // Only apply to banks with matching tag
        if (collateralTags.includes(existingBank.emode?.emodeTag)) {
          modifiedBanks.set(
            bankKey,
            Bank.withEmodeWeights(existingBank, {
              assetWeightMaint: activePair.assetWeightMaint,
              assetWeightInit: activePair.assetWeightInit,
            })
          );
        }
      });

      const collateralAmount = selectedAccount.pureAccount
        .computeFreeCollateralLegacy(modifiedBanks, oraclePrices)
        .toNumber();
      const collateralRatio =
        collateralAmount /
        selectedAccount.pureAccount
          .computeHealthComponentsLegacy(modifiedBanks, oraclePrices, MarginRequirementType.Initial, [])
          .assets.toNumber();

      return {
        amount: collateralAmount,
        ratio: collateralRatio,
      };
    } else {
      const collateralAmount = selectedAccount?.computeFreeCollateral().toNumber();
      const collateralRatio =
        collateralAmount / selectedAccount.computeHealthComponents(MarginRequirementType.Initial).assets.toNumber();

      return {
        amount: collateralAmount,
        ratio: collateralRatio,
      };
    }
  }, [actionSummary, emodeImpact, selectedAccount]);

  return (
    <>
      {availableCollateral ? (
        <ActionProgressBar
          amount={availableCollateral.amount}
          ratio={availableCollateral.ratio}
          label={"Available collateral"}
          TooltipValue={
            <div className="space-y-2">
              <p>Available collateral is the USD value of your collateral not actively backing a loan.</p>
              <p>It can be used to open additional borrows or withdraw part of your collateral.</p>
            </div>
          }
        />
      ) : (
        <ActionProgressBarSkeleton label="Available collateral" />
      )}
    </>
  );
};
