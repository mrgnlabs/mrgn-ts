import React from "react";

import { ExtendedBankInfo, ActionType } from "@mrgnlabs/mrgn-state";
import { computeBankRate, getEmodeStrategies, LendingModes } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem, BankListWrapper } from "~/components/action-box-v2/components";

import { BankTrigger, BankList } from "./components";
import { WalletToken } from "@mrgnlabs/mrgn-common";

type BankSelectProps = {
  selectedBank: ExtendedBankInfo | WalletToken | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  lendMode: ActionType;
  connected: boolean;
  isSelectable?: boolean;
  showTokenSelectionGroups?: boolean;
  setSelectedBank: (selectedBank: ExtendedBankInfo | WalletToken | null) => void;
  depositBank: ExtendedBankInfo | null;

  walletTokens?: WalletToken[] | null;
  showOnlyUserOwnedTokens?: boolean;
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
  walletTokens,
  showOnlyUserOwnedTokens,
  depositBank,
}: BankSelectProps) => {
  // idea check list if banks[] == 1 make it unselectable

  const emodeStrategies = React.useMemo(() => {
    return getEmodeStrategies(banks);
  }, [banks]);

  const enableEmodeByBank = React.useMemo(() => {
    const enableEmodeByBank: Record<string, boolean> = {};

    emodeStrategies.activateSupplyEmodeBanks.forEach((bank) => {
      enableEmodeByBank[bank.address.toBase58()] = true;
    });

    return enableEmodeByBank;
  }, [emodeStrategies]);

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
            enableEmodeByBank={enableEmodeByBank}
            nativeSolBalance={nativeSolBalance}
            connected={connected}
            showTokenSelectionGroups={showTokenSelectionGroups}
            walletTokens={walletTokens}
            showOnlyUserOwnedTokens={showOnlyUserOwnedTokens}
          />
        }
      />
    </>
  );
};
