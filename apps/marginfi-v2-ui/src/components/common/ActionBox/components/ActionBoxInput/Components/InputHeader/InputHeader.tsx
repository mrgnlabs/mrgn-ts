import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { LstType, YbxType, RepayType } from "@mrgnlabs/mrgn-utils";

import { useActionBoxStore } from "~/hooks/useActionBoxStore";

import { InputHeaderActionLeft } from "./Components";

type props = {
  isDialog?: boolean;
  isMini?: boolean;
  changeLstType: (lstType: LstType) => void;
  changeYbxType: (lstType: YbxType) => void;
  changeRepayType: (repayType: RepayType) => void;
  changeActionType: (actionType: ActionType) => void;
};

export const InputHeader = ({
  isDialog,
  isMini = false,
  changeRepayType,
  changeLstType,
  changeYbxType,
  changeActionType,
}: props) => {
  const [actionMode, selectedBank, ybxMode, lstMode, repayMode] = useActionBoxStore(isDialog)((state) => [
    state.actionMode,
    state.selectedBank,
    state.ybxMode,
    state.lstMode,
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
          ybxType={ybxMode}
          lstType={lstMode}
          isDialog={isDialog}
          isMini={isMini}
          changeYbxType={(value) => changeYbxType(value)}
          changeRepayType={(value) => changeRepayType(value)}
          changeLstType={(value) => changeLstType(value)}
          changeActionType={(value) => changeActionType(value)}
        />
      </div>

      {/* Amount action */}
      {/* <InputHeaderActionRight
        actionMode={actionMode}
        bank={selectedBank}
        maxAmount={maxAmount}
        walletAmount={walletAmount}
        selectedStakingAccount={selectedStakingAccount}
        onSetAmountRaw={onSetAmountRaw}
      /> */}
    </div>
  );
};
