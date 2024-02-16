import React from "react";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

import { RepayType } from "../ActionBox";

interface ActionBoxHeaderProps {
  actionType: ActionType;
  repayType?: RepayType;
  changeRepayType: (repayType: RepayType) => void;
}

export const ActionBoxHeader = ({
  actionType,
  repayType = RepayType.RepayRaw,
  changeRepayType,
}: ActionBoxHeaderProps) => {
  return (
    <>
      {actionType === ActionType.Repay ? (
        <div className="w-full flex flex-col items-center mb-3">
          <ToggleGroup
            type="single"
            size="lg"
            value={repayType}
            onValueChange={(value) => changeRepayType(value as RepayType)}
          >
            <ToggleGroupItem value={RepayType.RepayRaw} aria-label="Repay raw">
              {RepayType.RepayRaw}
            </ToggleGroupItem>
            <ToggleGroupItem value={RepayType.RepayCollat} aria-label="Repay collat">
              {RepayType.RepayCollat}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      ) : (
        <></>
      )}
    </>
  );
};
