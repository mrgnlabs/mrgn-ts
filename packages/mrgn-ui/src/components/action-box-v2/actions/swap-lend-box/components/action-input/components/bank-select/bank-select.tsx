import React from "react";

import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem, BankListWrapper } from "~/components/action-box-v2/components";

import { BankTrigger, BankList } from "./components";

type BankSelectProps = {
  selectedBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  lendMode: ActionType;
  connected: boolean;
  isSelectable?: boolean;
  showTokenSelectionGroups?: boolean;
  setSelectedBank: (selectedBank: ExtendedBankInfo | null) => void;
};

export const BankSelect = ({
  selectedBank,
  banks,
  nativeSolBalance,
  lendMode,
  connected,
  isSelectable = true,
  showTokenSelectionGroups,
  setSelectedBank,
}: BankSelectProps) => {
  // idea check list if banks[] == 1 make it unselectable
  const [isOpen, setIsOpen] = React.useState(false);

  const lendingMode = React.useMemo(
    () =>
      lendMode === ActionType.Deposit || lendMode === ActionType.Withdraw ? LendingModes.LEND : LendingModes.BORROW,
    [lendMode]
  );
  return (
    <>
      <BankListWrapper
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        Trigger={<BankTrigger selectedBank={selectedBank} lendingMode={lendingMode} isOpen={isOpen} />}
        Content={
          <BankList
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            selectedBank={selectedBank}
            onSetSelectedBank={setSelectedBank}
            lendMode={lendMode}
            banks={banks}
            nativeSolBalance={nativeSolBalance}
            connected={connected}
            showTokenSelectionGroups={showTokenSelectionGroups}
          />
        }
      />
    </>
  );
};