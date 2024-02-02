import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { StakeData } from "~/utils";

import { LendingPreview } from "./LendingPreview";
import { LstPreview } from "./LstPreview";
import { YbxPreview } from "./YbxPreview";

interface ActionBoxPreviewProps {
  selectedBank: ExtendedBankInfo | null;
  selectedStakingAccount: StakeData | null;
  actionMode: ActionType;
  amount: number;
  isEnabled: boolean;
  children: React.ReactNode;
}

export const ActionBoxPreview = ({
  selectedBank,
  selectedStakingAccount,
  actionMode,
  amount,
  isEnabled,
  children,
}: ActionBoxPreviewProps) => {
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
        <LstPreview
          selectedBank={selectedBank}
          selectedStakingAccount={selectedStakingAccount}
          isEnabled={isEnabled}
          amount={amount}
        >
          {children}
        </LstPreview>
      )}

      {actionMode === ActionType.MintYBX && (
        <YbxPreview selectedBank={selectedBank} isEnabled={isEnabled} amount={amount}>
          {children}
        </YbxPreview>
      )}
    </>
  );
};
