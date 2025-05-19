import React from "react";

import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { computeBankRate, LendingModes, LendSelectionGroups } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem, BankListWrapper } from "~/components/action-box-v2/components";

import { BankTrigger, BankList } from "./components";

type BankSelectProps = {
  selectedBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  lendMode: ActionType;
  connected: boolean;
  isSelectable?: boolean;
  selectionGroups?: LendSelectionGroups[];
  setSelectedBank: (selectedBank: ExtendedBankInfo | null) => void;
  isInitialOpen?: boolean;
  onCloseDialog?: () => void;
  isMixin?: boolean;
};

export const BankSelect = ({
  selectedBank,
  banks,
  nativeSolBalance,
  lendMode,
  connected,
  isSelectable = true,
  selectionGroups,
  setSelectedBank,
  isInitialOpen = false,
  onCloseDialog,
  isMixin,
}: BankSelectProps) => {
  // idea check list if banks[] == 1 make it unselectable
  const [isOpen, setIsOpen] = React.useState(isInitialOpen);

  const lendingMode = React.useMemo(
    () =>
      lendMode === ActionType.Deposit || lendMode === ActionType.Withdraw ? LendingModes.LEND : LendingModes.BORROW,
    [lendMode]
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
        <BankListWrapper
          isOpen={isOpen}
          setIsOpen={(open) => {
            !open && onCloseDialog?.();
            setIsOpen(open);
          }}
          Trigger={<BankTrigger selectedBank={selectedBank} lendingMode={lendingMode} isOpen={isOpen} />}
          Content={
            <BankList
              isOpen={isOpen}
              onClose={(hasSetBank) => {
                !hasSetBank && onCloseDialog?.();
                setIsOpen(false);
              }}
              selectedBank={selectedBank}
              onSetSelectedBank={setSelectedBank}
              actionType={lendMode}
              banks={banks}
              nativeSolBalance={nativeSolBalance}
              connected={connected}
              selectionGroups={selectionGroups}
              isMixin={isMixin}
            />
          }
        />
      )}
    </>
  );
};
