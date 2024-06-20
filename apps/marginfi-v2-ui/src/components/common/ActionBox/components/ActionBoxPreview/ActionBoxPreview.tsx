import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { ActionMethod, LoopingOptions, RepayWithCollatOptions, StakeData } from "~/utils";

import { LendingPreview, LstPreview, YbxPreview, LoopPreview } from "./Components";

interface ActionBoxPreviewProps {
  selectedBank: ExtendedBankInfo | null;
  selectedStakingAccount: StakeData | null;
  actionMode: ActionType;
  amount: number;
  slippageBps: number;
  isEnabled: boolean;
  repayWithCollatOptions?: RepayWithCollatOptions;
  loopOptions?: LoopingOptions;
  addAdditionalsPopup: (actions: ActionMethod[]) => void;
  children: React.ReactNode;
}

export const ActionBoxPreview = ({
  selectedBank,
  selectedStakingAccount,
  actionMode,
  amount,
  slippageBps,
  isEnabled,
  repayWithCollatOptions,
  loopOptions,
  addAdditionalsPopup,
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
        <LendingPreview
          selectedBank={selectedBank}
          actionMode={actionMode}
          isEnabled={isEnabled}
          amount={amount}
          repayWithCollatOptions={repayWithCollatOptions}
          addAdditionalsPopup={addAdditionalsPopup}
        >
          {children}
        </LendingPreview>
      )}

      {(actionMode === ActionType.MintLST || actionMode === ActionType.UnstakeLST) && (
        <LstPreview
          selectedBank={selectedBank}
          selectedStakingAccount={selectedStakingAccount}
          actionMode={actionMode}
          isEnabled={isEnabled}
          amount={amount}
          slippageBps={slippageBps}
        >
          {children}
        </LstPreview>
      )}

      {actionMode === ActionType.MintYBX && (
        <YbxPreview selectedBank={selectedBank} isEnabled={isEnabled} amount={amount}>
          {children}
        </YbxPreview>
      )}

      {actionMode === ActionType.Loop && (
        <LoopPreview
          selectedBank={selectedBank}
          actionMode={actionMode}
          isEnabled={isEnabled}
          amount={amount}
          loopOptions={loopOptions}
          addAdditionalsPopup={addAdditionalsPopup}
        >
          {children}
        </LoopPreview>
      )}
    </>
  );
};
