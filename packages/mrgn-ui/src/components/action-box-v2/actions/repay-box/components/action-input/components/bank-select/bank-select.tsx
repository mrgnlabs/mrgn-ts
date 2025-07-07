import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem, BankListWrapper } from "~/components/action-box-v2/components";

import { BankList, BankTrigger } from "./components";

interface BankSelectProps {
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  isInputSelectable?: boolean;

  setTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  setSecondaryTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
}

export const BankSelect = ({
  selectedBank,
  selectedSecondaryBank,
  banks,
  nativeSolBalance,
  isInputSelectable,

  setSecondaryTokenBank,
}: BankSelectProps) => {
  // idea check list if banks[] == 1 make it unselectable

  const [isOpen, setIsOpen] = React.useState(false);

  const calculateRate = React.useCallback((bank: ExtendedBankInfo) => {
    return computeBankRate(bank, LendingModes.BORROW);
  }, []);

  return (
    <>
      {isInputSelectable === false && (
        <div className="flex gap-3 w-full items-center">
          {selectedBank && (
            <SelectedBankItem
              bank={selectedSecondaryBank || selectedBank}
              lendingMode={LendingModes.BORROW}
              rate={calculateRate(selectedSecondaryBank || selectedBank)}
            />
          )}
        </div>
      )}

      {(isInputSelectable === true || isInputSelectable === undefined) && (
        <BankListWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          Trigger={<BankTrigger bank={selectedSecondaryBank} isOpen={isOpen} />}
          Content={
            <BankList
              banks={banks}
              nativeSolBalance={nativeSolBalance}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onSetSelectedSecondaryBank={(bank) => setSecondaryTokenBank(bank)}
              selectedSecondaryBank={selectedSecondaryBank}
              selectedBank={selectedBank}
            />
          }
        />
      )}
    </>
  );
};
