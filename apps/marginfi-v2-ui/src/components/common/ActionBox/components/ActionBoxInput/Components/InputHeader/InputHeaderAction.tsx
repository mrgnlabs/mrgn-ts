import React from "react";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { LstType, RepayType } from "~/utils";
import { useUiStore } from "~/store";
import { LendingModes } from "~/types";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconSparkles } from "~/components/ui/icons";

interface InputHeaderActionProps {
  actionType: ActionType;
  bank: ExtendedBankInfo | null;
  isDialog?: boolean;
  repayType?: RepayType;
  lstType?: LstType;
  changeRepayType: (repayType: RepayType) => void;
  changeLstType: (lstType: LstType) => void;
}

interface ToggleObject {
  toggles: { value: string; text: string }[];
  action: (value: any) => void;
  value: string;
}

export const InputHeaderAction = ({
  actionType,
  bank,
  lstType = LstType.Token,
  isDialog,
  repayType = RepayType.RepayRaw,
  changeRepayType,
  changeLstType,
}: InputHeaderActionProps) => {
  const [lendingModeFromStore, setLendingMode] = useUiStore((state) => [state.lendingMode, state.setLendingMode]);

  const titleText = React.useMemo(() => {
    const actionTitles: { [key in ActionType]?: string } = {
      [ActionType.Borrow]: "You borrow",
      [ActionType.Deposit]: "You supply",
      [ActionType.Withdraw]: "You withdraw",
      [ActionType.Repay]: "You repay",
      [ActionType.MintLST]: "You stake",
    };

    return actionTitles[actionType] || "";
  }, [actionType]);

  const toggleObject = React.useMemo(() => {
    if (!isDialog && (actionType === ActionType.Borrow || actionType === ActionType.Deposit)) {
      return {
        toggles: [
          { value: LendingModes.LEND, text: LendingModes.LEND },
          { value: LendingModes.BORROW, text: LendingModes.BORROW },
        ],
        action: (value: any) => {
          if (value) setLendingMode(value);
        },
        value: lendingModeFromStore,
      } as ToggleObject;
    }

    if (actionType === ActionType.Repay) {
      return {
        toggles: [
          { value: RepayType.RepayRaw, text: "wallet" },
          { value: RepayType.RepayCollat, text: "collateral" },
        ],
        action: (value: any) => {
          if (value) changeRepayType(value);
        },
        value: repayType,
      } as ToggleObject;
    }

    if (actionType === ActionType.MintLST) {
      return {
        toggles: [
          { value: LstType.Token, text: "Token" },
          { value: LstType.Native, text: "Native" },
        ],
        action: (value: any) => {
          if (value) changeLstType(value);
        },
        value: lstType,
      } as ToggleObject;
    }

    return titleText;
  }, [
    actionType,
    repayType,
    titleText,
    isDialog,
    lendingModeFromStore,
    setLendingMode,
    changeRepayType,
    changeLstType,
  ]);

  return (
    <>
      {/* Lending page header */}
      {typeof toggleObject !== "string" ? (
        <div>
          <ToggleGroup
            variant="actionBox"
            type="single"
            size="sm"
            className="bg-background"
            value={toggleObject.value}
            onValueChange={toggleObject.action}
          >
            {toggleObject.toggles.map((toggle, idx) => (
              <ToggleGroupItem
                key={idx}
                value={toggle.value}
                aria-label={toggle.value}
                className="w-1/2 text-xs capitalize data-[state=on]:bg-background-gray-light"
              >
                {toggle.text}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : (
        <span className="text-xs font-normal text-muted-foreground">{toggleObject}</span>
      )}
    </>
  );
};
