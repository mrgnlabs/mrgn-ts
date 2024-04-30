import React from "react";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { LstType, RepayType, YbxType } from "~/utils";
import { useLstStore, useUiStore } from "~/store";
import { LendingModes } from "~/types";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconSparkles } from "~/components/ui/icons";

interface InputHeaderActionProps {
  actionType: ActionType;
  bank: ExtendedBankInfo | null;
  isDialog?: boolean;
  repayType: RepayType;
  lstType: LstType;
  ybxType: YbxType;
  changeYbxType: (ybxType: YbxType) => void;
  changeRepayType: (repayType: RepayType) => void;
  changeLstType: (lstType: LstType) => void;
  changeActionType: (actionType: ActionType) => void;
}

interface ToggleObject {
  toggles: { value: string; text: string }[];
  action: (value: any) => void;
  value: string;
}

export const InputHeaderActionLeft = ({
  actionType,
  bank,
  lstType,
  isDialog,
  repayType,
  ybxType,
  changeYbxType,
  changeRepayType,
  changeLstType,
  changeActionType,
}: InputHeaderActionProps) => {
  const [stakeAccounts] = useLstStore((state) => [state.stakeAccounts]);

  const isSolBank = React.useMemo(() => bank?.meta.tokenSymbol === "SOL", [bank]);

  const titleText = React.useMemo(() => {
    const actionTitles: { [key in ActionType]?: string } = {
      [ActionType.Borrow]: "You borrow",
      [ActionType.Deposit]: "You supply",
      [ActionType.Withdraw]: "",
      [ActionType.Repay]: "",
      [ActionType.MintLST]: isSolBank ? "You stake" : "You swap",
      [ActionType.UnstakeLST]: "You unstake",
    };

    return actionTitles[actionType] || "";
  }, [actionType, isSolBank]);

  const toggleObject = React.useMemo(() => {
    if (!isDialog && (actionType === ActionType.Borrow || actionType === ActionType.Deposit)) {
      return {
        toggles: [
          { value: ActionType.Deposit, text: LendingModes.LEND },
          { value: ActionType.Borrow, text: LendingModes.BORROW },
        ],
        action: (value: any) => {
          if (value) changeActionType(value);
        },
        value: actionType,
      } as ToggleObject;
    }

    if (actionType === ActionType.Repay) {
      return {
        toggles: [
          { value: RepayType.RepayRaw, text: "Repay" },
          {
            value: RepayType.RepayCollat,
            text: (
              <div className="flex items-center gap-2">
                <IconSparkles size={16} /> Collateral Repay
              </div>
            ),
          },
        ],
        action: (value: any) => {
          if (value) changeRepayType(value);
        },
        value: repayType,
      } as ToggleObject;
    }

    if (actionType === ActionType.MintLST && stakeAccounts.length > 0) {
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

    if (actionType === ActionType.MintYBX && (ybxType === YbxType.AddCollat || ybxType === YbxType.WithdrawCollat)) {
      return {
        toggles: [
          { value: YbxType.AddCollat, text: "Add" },
          { value: YbxType.WithdrawCollat, text: "Withdraw" },
        ],
        action: (value: YbxType) => {
          if (value) changeYbxType(value);
        },
        value: ybxType,
      } as ToggleObject;
    }

    return titleText;
  }, [
    isDialog,
    actionType,
    stakeAccounts.length,
    ybxType,
    titleText,
    changeActionType,
    repayType,
    changeRepayType,
    lstType,
    changeLstType,
    changeYbxType,
  ]);

  return (
    <>
      {/* Lending page header */}
      {typeof toggleObject !== "string" ? (
        <div>
          <ToggleGroup
            variant="actionBox"
            type="single"
            className="bg-background"
            value={toggleObject.value}
            onValueChange={toggleObject.action}
          >
            {toggleObject.toggles.map((toggle, idx) => (
              <ToggleGroupItem
                key={idx}
                value={toggle.value}
                aria-label={toggle.value}
                className="data-[state=on]:bg-background-gray-light hover:bg-background-gray-light/25 capitalize h-[1.65rem]"
              >
                {toggle.text}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : (
        <span className="text-sm font-normal text-muted-foreground">{toggleObject}</span>
      )}
    </>
  );
};
