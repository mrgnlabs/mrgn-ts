import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType, ExtendedBankInfo, LstRatesMap, StakePoolMetadata } from "@mrgnlabs/mrgn-state";
import { computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem, BankListWrapper } from "~/components/action-box-v2/components";

import { BankList, BankTrigger } from "./components";
import { aprToApy, percentFormatter } from "@mrgnlabs/mrgn-common";

interface BankSelectProps {
  selectedBank: ExtendedBankInfo | null;
  otherBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  actionMode: ActionType;
  highlightEmodeBanks: Record<string, boolean>;
  lstRates?: LstRatesMap;
  lendMode: ActionType;

  setTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
}

export const BankSelect = ({
  selectedBank,
  otherBank,
  banks,
  nativeSolBalance,
  actionMode,
  highlightEmodeBanks,
  lstRates,
  lendMode,
  setTokenBank,
}: BankSelectProps) => {
  // idea check list if banks[] == 1 make it unselectable
  const isSelectable = React.useMemo(() => true, []);
  const [isOpen, setIsOpen] = React.useState(false);

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

  const rate = React.useMemo(() => {
    if (selectedBank) {
      return calculateRate(selectedBank);
    }
    return "";
  }, [selectedBank, calculateRate]);

  return (
    <>
      {!isSelectable && (
        <div className="flex gap-3 w-full items-center">
          {selectedBank && <SelectedBankItem bank={selectedBank} lendingMode={LendingModes.BORROW} rate={rate} />}
        </div>
      )}

      {isSelectable && (
        <BankListWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          Trigger={<BankTrigger bank={selectedBank} isOpen={isOpen} actionMode={actionMode} rate={rate} />}
          Content={
            <BankList
              banks={banks}
              lstRates={lstRates}
              nativeSolBalance={nativeSolBalance}
              actionMode={actionMode}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onSetSelectedBank={(bank) => setTokenBank(bank)}
              selectedBank={selectedBank}
              otherBank={otherBank}
              highlightEmodeBanks={highlightEmodeBanks}
            />
          }
        />
      )}
    </>
  );
};
