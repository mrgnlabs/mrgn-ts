import React from "react";

import { RepayType, LstType } from "~/utils";
import { useActionBoxStore } from "~/store";

import { InputHeaderActionLeft, InputHeaderActionRight } from "./Components";

type props = {
  walletAmount: number | undefined;
  maxAmount: number;

  isDialog?: boolean;
  showLendingHeader?: boolean;

  changeLstType: (lstType: LstType) => void;
  changeRepayType: (repayType: RepayType) => void;
  onSetAmountRaw: (amount: string) => void;
};

export const InputHeader = ({
  isDialog,
  maxAmount,
  walletAmount,
  changeRepayType,
  changeLstType,
  onSetAmountRaw,
}: props) => {
  const [actionMode, selectedBank, selectedStakingAccount, lstMode, repayMode] = useActionBoxStore((state) => [
    state.actionMode,
    state.selectedBank,
    state.selectedStakingAccount,
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
          lstType={lstMode}
          isDialog={isDialog}
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
