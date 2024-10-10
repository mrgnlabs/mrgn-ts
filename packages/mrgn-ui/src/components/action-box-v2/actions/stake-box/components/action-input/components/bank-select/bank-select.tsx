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

  setSelectedBank,
}: BankSelectProps) => {
  const isSelectable = React.useMemo(() => true, []);
  const [isOpen, setIsOpen] = React.useState(false);

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
