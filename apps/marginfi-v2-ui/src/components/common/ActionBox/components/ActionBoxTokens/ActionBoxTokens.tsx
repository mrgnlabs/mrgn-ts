import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LstType, RepayType } from "~/utils";

import { LendingTokens, YbxTokens, LstTokens } from "./Components";

interface ActionBoxPreviewProps {
  actionMode: ActionType;
  lstType: LstType;
  repayType?: RepayType;
  isDialog?: boolean;

  currentTokenBank?: PublicKey | null;
  repayTokenBank?: PublicKey | null;
  blacklistRepayTokens?: PublicKey[];

  setCurrentTokenBank?: (selectedTokenBank: PublicKey | null) => void;
  setRepayTokenBank?: (selectedTokenBank: PublicKey | null) => void;
}

export const ActionBoxTokens = ({
  currentTokenBank,
  repayTokenBank,
  actionMode,
  lstType,
  repayType,
  isDialog,
  blacklistRepayTokens,
  setRepayTokenBank,
  setCurrentTokenBank,
}: ActionBoxPreviewProps) => {
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
          currentTokenBank={currentTokenBank}
          setCurrentTokenBank={setCurrentTokenBank}
          isDialog={isDialog}
          repayTokenBank={repayTokenBank}
          setRepayTokenBank={setRepayTokenBank}
          blacklistRepayTokens={blacklistRepayTokens}
          repayType={repayType}
        />
      )}

      {isLstMode && setCurrentTokenBank && (
        <LstTokens
          lstType={lstType}
          isDialog={isDialog}
          actionMode={actionMode}
          currentTokenBank={currentTokenBank ?? null}
          setCurrentTokenBank={setCurrentTokenBank}
        />
      )}

      {actionMode === ActionType.MintYBX && currentTokenBank && <YbxTokens currentTokenBank={currentTokenBank} />}
    </>
  );
};
