import React from "react";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "~/hooks/useActionBoxStore";
import { StakeData } from "~/utils";

import { LendingTokens } from "./Components";
import { ActiveGroup } from "~/store/tradeStore";

interface ActionBoxPreviewProps {
  activeGroup: ActiveGroup | null;
  isDialog?: boolean;
  isTokenSelectable?: boolean;
  tokensOverride?: ExtendedBankInfo[];
  setTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  setRepayTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
}

export const ActionBoxTokens = ({
  activeGroup,
  isDialog,
  isTokenSelectable,
  tokensOverride,
  setRepayTokenBank,
  setTokenBank,
}: ActionBoxPreviewProps) => {
  const [actionMode, selectedBank, selectedRepayBank, repayMode] = useActionBoxStore(isDialog)((state) => [
    state.actionMode,
    state.selectedBank,
    state.selectedRepayBank,
    state.repayMode,
  ]);

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
        <LendingTokens
          activeGroup={activeGroup}
          selectedBank={selectedBank}
          selectedRepayBank={selectedRepayBank}
          setSelectedBank={setTokenBank}
          setSelectedRepayBank={setRepayTokenBank}
          repayType={repayMode}
          isDialog={isDialog}
          isTokenSelectable={isTokenSelectable}
          actionType={actionMode}
          tokensOverride={tokensOverride}
        />
      )}
    </>
  );
};
