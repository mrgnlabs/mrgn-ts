import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingPreview } from "./LendingPreview";
import { LstPreview } from "./LstPreview";

interface ActionBoxPreviewProps {
  selectedBank: ExtendedBankInfo;
  actionMode: ActionType;
  amount: number;
  isEnabled: boolean;
  children: React.ReactNode;
}

export const ActionBoxPreview = ({ selectedBank, actionMode, amount, isEnabled, children }: ActionBoxPreviewProps) => {
  const isInLendingMode = React.useMemo(
    () =>
      actionMode === ActionType.Borrow ||
      actionMode === ActionType.Deposit ||
      actionMode === ActionType.Repay ||
      actionMode === ActionType.Withdraw,
    [actionMode]
  );

  return (
    <>
      {isInLendingMode && (
        <LendingPreview selectedBank={selectedBank} actionMode={actionMode} isEnabled={isEnabled} amount={amount}>
          {children}
        </LendingPreview>
      )}

      {actionMode === ActionType.MintLST && (
        <LstPreview selectedBank={selectedBank} actionMode={actionMode} isEnabled={isEnabled} amount={amount}>
          {children}
        </LstPreview>
      )}
    </>
  );
};
