import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { RepayType } from "~/utils";

import { LendingTokens, YbxTokens, LstTokens } from "./Components";

interface ActionBoxPreviewProps {
  currentTokenBank?: PublicKey | null;
  setCurrentTokenBank?: (selectedTokenBank: PublicKey | null) => void;
  repayTokenBank?: PublicKey | null;
  setRepayTokenBank?: (selectedTokenBank: PublicKey | null) => void;
  actionMode: ActionType;
  repayType?: RepayType;
  isDialog?: boolean;
  highlightedRepayTokens?: PublicKey[];
}

export const ActionBoxTokens = ({
  currentTokenBank,
  setCurrentTokenBank,
  repayTokenBank,
  setRepayTokenBank,
  actionMode,
  repayType,
  isDialog,
  highlightedRepayTokens,
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
          currentTokenBank={currentTokenBank ?? null}
          setCurrentTokenBank={setCurrentTokenBank}
          hasDropdown={true}
        />
      )}

      {actionMode === ActionType.MintYBX && currentTokenBank && <YbxTokens currentTokenBank={currentTokenBank} />}
    </>
  );
};
