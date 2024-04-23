import React from "react";

import { RepayType, LstType, YbxType } from "~/utils";
import { useActionBoxStore } from "~/store";

import { InputHeaderActionLeft, InputHeaderActionRight } from "./Components";

type props = {
  isDialog?: boolean;

  changeLstType: (lstType: LstType) => void;
  changeYbxType: (lstType: YbxType) => void;
  changeRepayType: (repayType: RepayType) => void;
};

export const InputHeader = ({
  isDialog,

  changeRepayType,
  changeLstType,
  changeYbxType,
}: props) => {
  const [actionMode, selectedBank, ybxMode, lstMode, repayMode] = useActionBoxStore((state) => [
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
          changeYbxType={(value) => changeYbxType(value)}
          changeRepayType={(value) => changeRepayType(value)}
          changeLstType={(value) => changeLstType(value)}
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
