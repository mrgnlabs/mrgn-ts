import React from "react";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { RepayType } from "~/utils";
import { useUiStore } from "~/store";
import { LendingModes } from "~/types";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconSparkles } from "~/components/ui/icons";

interface ActionBoxHeaderProps {
  actionType: ActionType;
  bank: ExtendedBankInfo | null;
  showLendingHeader?: boolean;
  repayType?: RepayType;
  changeRepayType: (repayType: RepayType) => void;
}

export const ActionBoxHeader = ({
  actionType,
  bank,
  showLendingHeader,
  repayType = RepayType.RepayRaw,
  changeRepayType,
}: ActionBoxHeaderProps) => {
  const [lendingModeFromStore, setLendingMode] = useUiStore((state) => [state.lendingMode, state.setLendingMode]);

  return (
    <>
      {/* Lending page header */}
      {showLendingHeader && (
        <div className="w-full flex flex-col items-center mb-6">
          <ToggleGroup
            type="single"
            size="lg"
            value={lendingModeFromStore}
            onValueChange={() => {
              // setSelectedTokenBank(null);
              setLendingMode(lendingModeFromStore === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND);
            }}
            className="w-full md:w-4/5"
          >
            <ToggleGroupItem value={LendingModes.LEND} aria-label="lend" className="w-1/2 text-xs capitalize">
              {LendingModes.LEND}
            </ToggleGroupItem>
            <ToggleGroupItem
              value={LendingModes.BORROW}
              aria-label="borrow"
              className="w-1/2 text-xs gap-1.5 capitalize"
            >
              {LendingModes.BORROW}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Repay header */}
      {/* {actionType === ActionType.Repay && (
        <div className="w-full flex flex-col items-center mb-6">
          <ToggleGroup
            type="single"
            size="lg"
            value={repayType}
            onValueChange={(value) => changeRepayType(value as RepayType)}
            className="w-full md:w-4/5"
          >
            <ToggleGroupItem value={RepayType.RepayRaw} aria-label="Repay raw" className="w-1/2 text-xs">
              {RepayType.RepayRaw.concat(" ", bank?.meta.tokenSymbol ?? "")}
            </ToggleGroupItem>
            <ToggleGroupItem value={RepayType.RepayCollat} aria-label="Repay collat" className="w-1/2 text-xs gap-1.5">
              <IconSparkles size={16} />
              {RepayType.RepayCollat}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )} */}
    </>
  );
};
