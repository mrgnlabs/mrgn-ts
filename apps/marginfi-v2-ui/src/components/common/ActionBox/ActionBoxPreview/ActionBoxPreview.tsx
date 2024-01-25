import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingPreview } from "./LendingPreview";

interface ActionBoxPreviewProps {
  selectedBank: ExtendedBankInfo;
  actionMode: ActionType;
  amount: number;
  isEnabled: boolean;
  children: React.ReactNode;
}

export const ActionBoxPreview = ({ selectedBank, actionMode, amount, isEnabled, children }: ActionBoxPreviewProps) => {
  return (
    <>
      <LendingPreview selectedBank={selectedBank} actionMode={actionMode} isEnabled={isEnabled} amount={amount}>
        {children}
      </LendingPreview>
    </>
  );
};
