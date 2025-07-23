import React from "react";

import { ExtendedBankInfo, ActionType, StakePoolMetadata, LstRatesMap, EmissionsRateData } from "@mrgnlabs/mrgn-state";
import { computeBankRateRaw, LendingModes, LendSelectionGroups } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem, BankListWrapper } from "~/components/action-box-v2/components";

import { BankTrigger, BankList } from "./components";
import { percentFormatter } from "@mrgnlabs/mrgn-common";

type BankSelectProps = {
  selectedBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  lstRates?: LstRatesMap;
  emissionsRates?: EmissionsRateData;
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
  emissionsRates,
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

  const rate = React.useMemo(() => {
    if (selectedBank) {
      const emissionsRate = emissionsRates?.[selectedBank.address.toBase58()];
      const apyRate = computeBankRateRaw(selectedBank, lendingMode);
      return percentFormatter.format(
        apyRate + (lendingMode === LendingModes.LEND ? emissionsRate?.annualized_rate_enhancement || 0 : 0)
      );
    }
    return "";
  }, [selectedBank, lendingMode, emissionsRates]);

  return (
    <>
      {!isSelectable && (
        <div className="flex gap-3 w-full items-center">
          {selectedBank && (
            <SelectedBankItem
              bank={selectedBank}
              lendingMode={lendingMode}
              rate={rate}
              includesEmissionsRate={!!emissionsRates?.[selectedBank?.address.toBase58() ?? ""]}
            />
          )}
        </div>
      )}

      {isSelectable && (
        <BankListWrapper
          isOpen={isOpen}
          setIsOpen={(open) => {
            setIsOpen(open);
          }}
          Trigger={
            <BankTrigger
              selectedBank={selectedBank}
              lendingMode={lendingMode}
              isOpen={isOpen}
              rate={rate}
              includesEmissionsRate={!!emissionsRates?.[selectedBank?.address.toBase58() ?? ""]}
            />
          }
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
              emissionsRates={emissionsRates}
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
