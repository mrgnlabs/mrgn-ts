import React from "react";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "~/hooks/useActionBoxStore";
import { StakeData } from "~/utils";

import { LendingTokens, YbxTokens, LstTokens } from "./Components";
import { ActiveGroup } from "~/store/tradeStore";

interface ActionBoxPreviewProps {
  activeGroup: ActiveGroup | null;
  isDialog?: boolean;
  isTokenSelectable?: boolean;
  tokensOverride?: ExtendedBankInfo[];
  setTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  setRepayTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  setStakingAccount: (account: StakeData) => void;
}

export const ActionBoxTokens = ({
  activeGroup,
  isDialog,
  isTokenSelectable,
  tokensOverride,
  setRepayTokenBank,
  setTokenBank,
  setStakingAccount,
}: ActionBoxPreviewProps) => {
  const [actionMode, selectedBank, selectedRepayBank, selectedStakingAccount, lstMode, repayMode] = useActionBoxStore(
    isDialog
  )((state) => [
    state.actionMode,
    state.selectedBank,
    state.selectedRepayBank,
    state.selectedStakingAccount,
    state.lstMode,
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

  const isLstMode = React.useMemo(
    () => actionMode === ActionType.MintLST || actionMode === ActionType.UnstakeLST,
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

      {isLstMode && (
        <LstTokens
          lstType={lstMode}
          isDialog={isDialog}
          actionMode={actionMode}
          selectedStakingAccount={selectedStakingAccount}
          selectedBank={selectedBank}
          setSelectedBank={setTokenBank}
          setStakingAccount={setStakingAccount}
        />
      )}

      {actionMode === ActionType.MintYBX && selectedBank && <YbxTokens selectedBank={selectedBank} />}
    </>
  );
};
