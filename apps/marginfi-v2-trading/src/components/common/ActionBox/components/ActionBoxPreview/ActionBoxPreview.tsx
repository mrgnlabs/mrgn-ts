import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { ActionMethod, RepayWithCollatOptions, StakeData } from "~/utils";

import { LendingPreview, LstPreview, YbxPreview } from "./Components";
import { GroupData } from "~/store/tradeStore";

interface ActionBoxPreviewProps {
  selectedBank: ExtendedBankInfo | null;
  selectedStakingAccount: StakeData | null;
  activeGroup: GroupData | null;
  actionMode: ActionType;
  amount: number;
  slippageBps: number;
  isEnabled: boolean;
  repayWithCollatOptions?: RepayWithCollatOptions;
  addAdditionalsPopup: (actions: ActionMethod[]) => void;
  children: React.ReactNode;
}

export const ActionBoxPreview = ({
  selectedBank,
  selectedStakingAccount,
  activeGroup,
  actionMode,
  amount,
  slippageBps,
  isEnabled,
  repayWithCollatOptions,
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
          activeGroup={activeGroup}
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
    </>
  );
};
