import React from "react";

import { RepayType } from "@mrgnlabs/mrgn-utils";
import { useActionBoxStore } from "~/hooks/useActionBoxStore";

import { InputHeaderActionLeft } from "./Components";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

type props = {
  isDialog?: boolean;

  changeRepayType: (repayType: RepayType) => void;
  changeActionType: (actionType: ActionType) => void;
};

export const InputHeader = ({ isDialog, changeRepayType, changeActionType }: props) => {
  const [actionMode, selectedBank, repayMode] = useActionBoxStore(isDialog)((state) => [
    state.actionMode,
    state.selectedBank,

    state.repayMode,
  ]);

  // Section above the input
  return (
    <div className="flex flex-row items-center justify-between mb-2">
      {/* Title text */}

      <div className="text-lg font-normal flex items-center">
        <InputHeaderActionLeft
          actionType={actionMode}
          bank={selectedBank}
          repayType={repayMode}
          isDialog={isDialog}
          changeRepayType={(value) => changeRepayType(value)}
          changeActionType={(value) => changeActionType(value)}
        />
      </div>
    </div>
  );
};
