import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingTokens } from "./LendingTokens";
import { LstTokens } from "./MintTokens";
import { YbxTokens } from "./YbxTokens";

interface ActionBoxPreviewProps {
  currentTokenBank?: PublicKey | null;
  setCurrentTokenBank?: (selectedTokenBank: PublicKey | null) => void;
  repayTokenBank?: PublicKey | null;
  setRepayTokenBank?: (selectedTokenBank: PublicKey | null) => void;
  actionMode: ActionType;
  isDialog?: boolean;
  repay?: boolean;
}

export const ActionBoxTokens = ({
  currentTokenBank,
  setCurrentTokenBank,
  repayTokenBank,
  setRepayTokenBank,
  actionMode,
  isDialog,
  repay,
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
          repay={repay}
        />
      )}

      {actionMode === ActionType.MintLST && currentTokenBank && setCurrentTokenBank && (
        <LstTokens currentTokenBank={currentTokenBank} setCurrentTokenBank={setCurrentTokenBank} hasDropdown={true} />
      )}

      {actionMode === ActionType.MintYBX && currentTokenBank && <YbxTokens currentTokenBank={currentTokenBank} />}
    </>
  );
};
