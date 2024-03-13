import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { ActionBoxTokens } from "~/components/common/ActionBox/components";
import { RepayType, clampedNumeralFormatter } from "~/utils";
import { PublicKey } from "@solana/web3.js";
import { Input } from "~/components/ui/input";

type ActionBoxRepayInputProps = {
  actionMode: ActionType;
  selectedRepayBank: ExtendedBankInfo | null;
  selectedRepayTokenBank: PublicKey | null;
  directRoutes: PublicKey[] | undefined;
  rawRepayAmount: string | undefined;
  repayMode: RepayType;
  isDialog?: boolean;

  onSetSelectedBank: (bank: PublicKey | null) => void;
};

export const ActionBoxRepayInput = ({
  actionMode,
  selectedRepayBank,
  selectedRepayTokenBank,
  directRoutes,
  rawRepayAmount,
  repayMode,
  isDialog,

  onSetSelectedBank,
}: ActionBoxRepayInputProps) => {
  return (
    <>
      <div className="flex flex-row font-normal items-center justify-between mb-3">
        <div className="text-lg flex items-center">Using collateral</div>
        {selectedRepayBank && (
          <div className="inline-flex gap-1.5 items-center text-sm">
            <span className="text-muted-foreground">Supplied:</span>
            {selectedRepayBank.isActive &&
              selectedRepayBank.position.isLending &&
              (selectedRepayBank.position.amount
                ? clampedNumeralFormatter(selectedRepayBank.position.amount).concat(
                    " ",
                    selectedRepayBank.meta.tokenSymbol
                  )
                : "-")}
          </div>
        )}
      </div>
      <div className="bg-[#171C1C] text-3xl rounded-lg flex flex-wrap xs:flex-nowrap gap-3 xs:gap-0 justify-center items-center px-3 py-2.5 mb-5">
        <div className="w-full xs:w-[162px]">
          <ActionBoxTokens
            isDialog={isDialog}
            repayTokenBank={selectedRepayTokenBank}
            setRepayTokenBank={onSetSelectedBank}
            actionMode={actionMode}
            highlightedRepayTokens={directRoutes}
            repayType={repayMode}
          />
        </div>
        <div className="flex-1">
          <Input
            type="text"
            value={rawRepayAmount}
            disabled={true}
            placeholder="0"
            className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base cursor-default"
          />
        </div>
      </div>
    </>
  );
};
