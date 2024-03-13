import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingTokens, YbxTokens, LstTokens } from "./Components";

interface ActionBoxPreviewProps {
  currentTokenBank?: PublicKey | null;
  setCurrentTokenBank?: (selectedTokenBank: PublicKey | null) => void;
  repayTokenBank?: PublicKey | null;
  setRepayTokenBank?: (selectedTokenBank: PublicKey | null) => void;
  actionMode: ActionType;
  isDialog?: boolean;
  isRepay?: boolean;
  highlightedTokens?: PublicKey[];
}

export const ActionBoxTokens = ({
  currentTokenBank,
  setCurrentTokenBank,
  repayTokenBank,
  setRepayTokenBank,
  actionMode,
  isDialog,
  isRepay,
  highlightedTokens,
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
          repayTokenBank={repayTokenBank}
          setRepayTokenBank={setRepayTokenBank}
          isDialog={isDialog}
          highlightedTokens={highlightedTokens}
          isRepay={isRepay}
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
