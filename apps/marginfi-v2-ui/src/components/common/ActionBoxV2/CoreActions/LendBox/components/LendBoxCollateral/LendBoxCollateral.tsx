import React from "react";

import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";

import { ActionProgressBar } from "~/components/common/ActionBoxV2/sharedComponents/ActionStats";

import { useLendBoxStore } from "../../store";

interface LendBoxCollateralProps {}

export const LendBoxCollateral = ({}: LendBoxCollateralProps) => {
  const [actionSummary, selectedAccount] = useLendBoxStore((state) => [state.actionSummary, state.selectedAccount]);

  const availableCollateral = React.useMemo(() => {
    if (!selectedAccount) return null;

    if (actionSummary?.simulationPreview?.availableCollateral) {
      return actionSummary.simulationPreview.availableCollateral;
    }

    const collateralAmount = selectedAccount?.computeFreeCollateral().toNumber();
    const collateralRatio =
      collateralAmount / selectedAccount.computeHealthComponents(MarginRequirementType.Initial).assets.toNumber();

    return {
      amount: collateralAmount,
      ratio: collateralRatio,
    };
  }, [actionSummary, selectedAccount]);

  return (
    <>
      {availableCollateral && (
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
      )}
    </>
  );
};
