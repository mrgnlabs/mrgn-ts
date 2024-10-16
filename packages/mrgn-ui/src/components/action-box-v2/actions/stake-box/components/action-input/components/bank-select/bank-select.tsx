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
  connected: boolean;

  setSelectedBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
}

export const BankSelect = ({
  selectedBank,
  banks,
  nativeSolBalance,
  actionMode,
  connected,
  // isSelectable = true,

  setSelectedBank,
}: BankSelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const isSelectable = React.useMemo(() => {
    if (!selectedBank || selectedBank.meta.tokenSymbol !== "LST") {
      return true;
    }
    return false;
  }, [selectedBank]); // TODO: check if this is correct, not sure if this is the correct way to check if it is selectable

  return (
    <>
      {!isSelectable && (
        <div className="flex gap-3 w-full items-center">{selectedBank && <SelectedBankItem bank={selectedBank} />}</div>
      )}

      {isSelectable && (
        <BankListWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          Trigger={<BankTrigger bank={selectedBank} isOpen={isOpen} actionMode={actionMode} />}
          Content={
            <BankList
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              selectedBank={selectedBank}
              onSetSelectedBank={setSelectedBank}
              actionMode={actionMode}
              banks={banks}
              nativeSolBalance={nativeSolBalance}
              connected={connected}
            />
          }
        />
      )}
    </>
  );
};
