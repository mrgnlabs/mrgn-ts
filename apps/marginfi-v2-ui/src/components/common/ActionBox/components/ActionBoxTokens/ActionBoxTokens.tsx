import React from "react";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { StakeData } from "@mrgnlabs/mrgn-utils";

import { useActionBoxStore } from "~/hooks/useActionBoxStore";

import { LendingTokens, YbxTokens, LstTokens, LoopingTokens } from "./Components";

interface ActionBoxPreviewProps {
  isDialog?: boolean;
  actionModeOverride?: ActionType;
  setTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  setRepayTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  setStakingAccount: (account: StakeData) => void;
  setLoopBank: (selectedLoopBank: ExtendedBankInfo | null) => void;
}

export const ActionBoxTokens = ({
  isDialog,
  actionModeOverride,
  setRepayTokenBank,
  setTokenBank,
  setStakingAccount,
  setLoopBank,
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

  const isLoopMode = React.useMemo(() => actionMode === ActionType.Loop, [actionMode]);

  return (
    <>
      {isInLendingMode && (
        <LendingTokens
          selectedBank={selectedBank}
          selectedRepayBank={selectedRepayBank}
          setSelectedBank={setTokenBank}
          setSelectedRepayBank={setRepayTokenBank}
          repayType={repayMode}
          isDialog={isDialog}
          actionType={actionMode}
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

      {isLoopMode && (
        <LoopingTokens
          isDialog={isDialog}
          selectedBank={actionModeOverride === ActionType.Borrow ? selectedRepayBank : selectedBank}
          actionType={actionModeOverride || actionMode}
          setSelectedBank={actionModeOverride === ActionType.Borrow ? setLoopBank : setTokenBank}
        />
      )}

      {actionMode === ActionType.MintYBX && selectedBank && <YbxTokens selectedBank={selectedBank} />}
    </>
  );
};
