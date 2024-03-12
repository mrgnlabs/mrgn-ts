import React from "react";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { RepayType } from "~/utils";
import { useUiStore } from "~/store";
import { LendingModes } from "~/types";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconSparkles } from "~/components/ui/icons";

interface InputHeaderActionProps {
  actionType: ActionType;
  bank: ExtendedBankInfo | null;
  isDialog?: boolean;
  repayType?: RepayType;
  changeRepayType: (repayType: RepayType) => void;
}

export const InputHeaderAction = ({
  actionType,
  bank,
  isDialog,
  repayType = RepayType.RepayRaw,
  changeRepayType,
}: InputHeaderActionProps) => {
  const [lendingModeFromStore, setLendingMode] = useUiStore((state) => [state.lendingMode, state.setLendingMode]);

  const isInLendingMode = React.useMemo(
    () =>
      actionType === ActionType.Borrow ||
      actionType === ActionType.Deposit ||
      actionType === ActionType.Repay ||
      actionType === ActionType.Withdraw,
    [actionType]
  );

  const isToggleEnabled = React.useMemo(() => isDialog, [isDialog]);

  const toggleObject = React.useMemo(() => {
    if (isToggleEnabled) {
      if (actionType === ActionType.Borrow || actionType === ActionType.Deposit) {
        return {};
      }
    }
  }, [isToggleEnabled]);

  return (
    <>
      {/* Lending page header */}
      {true && (
        <div>
          <ToggleGroup
            variant="actionBox"
            type="single"
            size="sm"
            className="bg-background"
            value={lendingModeFromStore}
            onValueChange={() => {
              setLendingMode(lendingModeFromStore === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND);
            }}
          >
            <ToggleGroupItem value={LendingModes.LEND} aria-label="lend" className="w-1/2 text-xs capitalize">
              {LendingModes.LEND}
            </ToggleGroupItem>
            <ToggleGroupItem value={LendingModes.BORROW} aria-label="borrow" className="w-1/2 text-xs capitalize">
              {LendingModes.BORROW}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Repay header */}
      {actionType === ActionType.Repay && (
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
      )}
    </>
  );
};
