import React from "react";

import { ExtendedBankInfo, ActionType, StakePoolMetadata, LstRatesMap } from "@mrgnlabs/mrgn-state";
import { computeBankRate, LendingModes, LendSelectionGroups } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem, BankListWrapper } from "~/components/action-box-v2/components";

import { BankTrigger, BankList } from "./components";
import { percentFormatter } from "@mrgnlabs/mrgn-common";

type BankSelectProps = {
  selectedBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  lstRates?: LstRatesMap;
  nativeSolBalance: number;
  lendMode: ActionType;
  connected: boolean;
  isSelectable?: boolean;
  selectionGroups?: LendSelectionGroups[];
  stakePoolMetadata?: StakePoolMetadata;
  setSelectedBank: (selectedBank: ExtendedBankInfo | null) => void;
};

export const BankSelect = ({
  selectedBank,
  banks,
  lstRates,
  nativeSolBalance,
  lendMode,
  connected,
  isSelectable = true,
  selectionGroups,
  stakePoolMetadata,
  setSelectedBank,
}: BankSelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const lendingMode = React.useMemo(
    () =>
      lendMode === ActionType.Deposit || lendMode === ActionType.Withdraw ? LendingModes.LEND : LendingModes.BORROW,
    [lendMode]
  );

  const calculateRate = React.useCallback(
    (bank: ExtendedBankInfo) => {
      const lstRate = lstRates?.get(bank.info.state.mint.toBase58());
      if (bank.info.rawBank.config.assetTag === 2) {
        return stakePoolMetadata?.validatorRewards
          ? percentFormatter.format(stakePoolMetadata?.validatorRewards / 100)
          : "0%";
      } else if (lstRate && lendingMode === LendingModes.LEND) {
        return percentFormatter.format(bank.info.state.lendingRate + lstRate);
      }

      return computeBankRate(bank, lendingMode);
    },
    [lendingMode, stakePoolMetadata, lstRates]
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
          {selectedBank && <SelectedBankItem bank={selectedBank} lendingMode={lendingMode} rate={rate} />}
        </div>
      )}

      {isSelectable && (
        <BankListWrapper
          isOpen={isOpen}
          setIsOpen={(open) => {
            setIsOpen(open);
          }}
          Trigger={<BankTrigger selectedBank={selectedBank} lendingMode={lendingMode} isOpen={isOpen} rate={rate} />}
          Content={
            <BankList
              isOpen={isOpen}
              onClose={() => {
                setIsOpen(false);
              }}
              selectedBank={selectedBank}
              onSetSelectedBank={setSelectedBank}
              actionType={lendMode}
              banks={banks}
              lstRates={lstRates}
              nativeSolBalance={nativeSolBalance}
              connected={connected}
              selectionGroups={selectionGroups}
              stakePoolMetadata={stakePoolMetadata}
            />
          }
        />
      )}
    </>
  );
};
