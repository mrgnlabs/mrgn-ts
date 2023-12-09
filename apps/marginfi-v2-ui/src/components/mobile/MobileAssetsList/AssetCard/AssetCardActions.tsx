import React, { FC, useMemo, useState } from "react";
import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { AssetRowAction, AssetRowInputBox } from "~/components/common/AssetList";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { useUiStore } from "~/store";

export const AssetCardActions: FC<{
  bank: ExtendedBankInfo;
  currentAction: ActionType;
}> = ({ bank, currentAction }) => {
  const [setSelectedToken] = useUiStore((state) => [state.setSelectedToken]);

  const isDust = React.useMemo(() => bank.isActive && bank.position.isDust, [bank]);
  const showCloseBalance = React.useMemo(
    () => currentAction === ActionType.Withdraw && isDust,
    [currentAction, isDust]
  ); // Only case we should show close balance is when we are withdrawing a dust balance, since user receives 0 tokens back (vs repaying a dust balance where the input box will show the smallest unit of the token)

  return (
    <>
      <div className="flex flex-row gap-[10px] justify-between w-full">
        <ActionBoxDialog>
          <AssetRowAction
            className="w-full"
            bgColor={
              currentAction === ActionType.Deposit || currentAction === ActionType.Borrow
                ? "rgb(227, 227, 227)"
                : "rgba(0,0,0,0)"
            }
            onClick={() => setSelectedToken(bank)}
          >
            {showCloseBalance ? "Close" : currentAction}
          </AssetRowAction>
        </ActionBoxDialog>
      </div>
    </>
  );
};
