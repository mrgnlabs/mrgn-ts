import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem, BankListWrapper } from "~/components/action-box-v2/components";

import { BankList, BankTrigger } from "./components";

interface BankSelectProps {
  selectedBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  actionMode: ActionType;

  setTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
}

export const BankSelect = ({ selectedBank, banks, nativeSolBalance, actionMode, setTokenBank }: BankSelectProps) => {
  // idea check list if banks[] == 1 make it unselectable
  const isSelectable = React.useMemo(() => true, []);
  const [isOpen, setIsOpen] = React.useState(false);

  const calculateRate = React.useCallback((bank: ExtendedBankInfo) => {
    return computeBankRate(bank, LendingModes.BORROW);
  }, []);

  return (
    <>
      {!isSelectable && (
        <div className="flex gap-3 w-full items-center">
          {selectedBank && (
            <SelectedBankItem
              bank={selectedBank}
              lendingMode={LendingModes.BORROW}
              rate={calculateRate(selectedBank)}
            />
          )}
        </div>
      )}

      {isSelectable && (
        <BankListWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          Trigger={<BankTrigger bank={selectedBank} isOpen={isOpen} />}
          Content={
            <BankList
              banks={banks}
              nativeSolBalance={nativeSolBalance}
              actionMode={actionMode}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onSetSelectedBank={(bank) => setTokenBank(bank)}
              selectedBank={selectedBank}
            />
          }
        />
      )}
    </>
  );
};
