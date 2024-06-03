import React from "react";

import { PublicKey } from "@solana/web3.js";

import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { RepayType, computeBankRate } from "~/utils";

import { SelectedBankItem, TokenListWrapper } from "../SharedComponents";
import { LendingTokensList, RepayCollatTokensList, LendingTokensTrigger } from "./Components";

type LendingTokensProps = {
  selectedBank: ExtendedBankInfo | null;
  selectedRepayBank: ExtendedBankInfo | null;
  actionType: ActionType;
  isDialog?: boolean;
  repayType?: RepayType;
  blacklistRepayTokens?: PublicKey[];

  setSelectedRepayBank: (selectedBank: ExtendedBankInfo | null) => void;
  setSelectedBank: (selectedBank: ExtendedBankInfo | null) => void;
};

export const LendingTokens = ({
  selectedBank,
  selectedRepayBank,
  actionType,
  isDialog,
  repayType,
  blacklistRepayTokens = [],

  setSelectedRepayBank,
  setSelectedBank,
}: LendingTokensProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const isSelectable = React.useMemo(() => !isDialog || repayType === RepayType.RepayCollat, [isDialog, repayType]);

  const lendingMode = React.useMemo(
    () => (actionType === ActionType.Deposit ? LendingModes.LEND : LendingModes.BORROW),
    [actionType]
  );

  const calculateRate = React.useCallback(
    (bank: ExtendedBankInfo) => {
      return computeBankRate(bank, lendingMode);
    },
    [lendingMode]
  );

  return (
    <>
      {!isSelectable && (
        <div className="flex gap-3 w-full items-center">
          {selectedBank && (
            <SelectedBankItem bank={selectedBank} lendingMode={lendingMode} rate={calculateRate(selectedBank)} />
          )}
        </div>
      )}

      {isSelectable && (
        <TokenListWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          Trigger={
            <LendingTokensTrigger
              selectedBank={selectedBank}
              selectedRepayBank={selectedRepayBank}
              lendingMode={lendingMode}
              isOpen={isOpen}
              repayType={repayType}
            />
          }
          Content={
            repayType === RepayType.RepayCollat ? (
              <RepayCollatTokensList
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSetSelectedRepayBank={setSelectedRepayBank}
                blacklistRepayTokens={blacklistRepayTokens}
                selectedRepayBank={null}
              />
            ) : (
              <LendingTokensList
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                selectedBank={selectedBank}
                onSetSelectedBank={setSelectedBank}
                isDialog={isDialog}
                actionMode={actionType}
              />
            )
          }
        />
      )}
    </>
  );
};
