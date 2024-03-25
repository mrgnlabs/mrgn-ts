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
  highlightedRepayTokens?: PublicKey[];

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
  highlightedRepayTokens,
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

  return (
    <>
      {isInLendingMode && (
        <LendingTokens
          currentTokenBank={currentTokenBank}
          setCurrentTokenBank={setCurrentTokenBank}
          isDialog={isDialog}
          repayTokenBank={repayTokenBank}
          setRepayTokenBank={setRepayTokenBank}
          highlightedRepayTokens={highlightedRepayTokens}
          repayType={repayType}
        />
      )}

      {actionMode === ActionType.MintLST && setCurrentTokenBank && (
        <LstTokens
          lstType={lstType}
          isDialog={isDialog}
          currentTokenBank={currentTokenBank ?? null}
          setCurrentTokenBank={setCurrentTokenBank}
        />
      )}

      {actionMode === ActionType.MintYBX && currentTokenBank && <YbxTokens currentTokenBank={currentTokenBank} />}
    </>
  );
};
