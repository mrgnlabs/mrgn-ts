import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType, EmissionsRateData, ExtendedBankInfo, LstRatesMap, StakePoolMetadata } from "@mrgnlabs/mrgn-state";
import { computeBankRate, computeBankRateRaw, LendingModes } from "@mrgnlabs/mrgn-utils";

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
  emissionsRates?: EmissionsRateData;
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
  emissionsRates,
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
              lendingMode={LendingModes.BORROW}
              rate={rate}
              includesEmissionsRate={!!emissionsRates?.[selectedBank?.address.toBase58() ?? ""]}
            />
          )}
        </div>
      )}

      {isSelectable && (
        <BankListWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          Trigger={
            <BankTrigger
              bank={selectedBank}
              isOpen={isOpen}
              actionMode={actionMode}
              rate={rate}
              includesEmissionsRate={!!emissionsRates?.[selectedBank?.address.toBase58() ?? ""]}
            />
          }
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
              lendingMode={lendingMode}
              emissionsRates={emissionsRates}
            />
          }
        />
      )}
    </>
  );
};
