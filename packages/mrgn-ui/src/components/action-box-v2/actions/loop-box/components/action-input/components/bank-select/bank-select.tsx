import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem, BankListWrapper } from "~/components/action-box-v2/components";

import { BankList, BankTrigger } from "./components";

interface BankSelectProps {
  selectedBank: ExtendedBankInfo | null;
  otherBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  actionMode: ActionType;
  emodeConfig: {
    highlightedEmodeBanks: PublicKey[];
    highlightAll: boolean;
  };

  setTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
}

export const BankSelect = ({
  selectedBank,
  otherBank,
  banks,
  nativeSolBalance,
  actionMode,
  emodeConfig,
  setTokenBank,
}: BankSelectProps) => {
  // idea check list if banks[] == 1 make it unselectable
  const isSelectable = React.useMemo(() => true, []);
  const [isOpen, setIsOpen] = React.useState(false);

  const calculateRate = React.useCallback(
    (bank: ExtendedBankInfo) => {
      return computeBankRate(bank, actionMode === ActionType.Borrow ? LendingModes.BORROW : LendingModes.LEND);
    },
    [actionMode]
  );

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
          Trigger={<BankTrigger bank={selectedBank} isOpen={isOpen} actionMode={actionMode} />}
          Content={
            <BankList
              banks={banks}
              nativeSolBalance={nativeSolBalance}
              actionMode={actionMode}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onSetSelectedBank={(bank) => setTokenBank(bank)}
              selectedBank={selectedBank}
              otherBank={otherBank}
              emodeConfig={emodeConfig}
            />
          }
        />
      )}
    </>
  );
};
