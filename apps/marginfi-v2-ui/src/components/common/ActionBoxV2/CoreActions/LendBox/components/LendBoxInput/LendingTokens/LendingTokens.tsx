import React from "react";

import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem, TokenListWrapper } from "~/components/common/ActionBoxV2/sharedComponents";

import { LendingTokensTrigger } from "./LendingTokensTrigger";
import { LendingTokensList } from "./LendingTokensList";

type LendingTokensProps = {
  selectedBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  actionType: ActionType;

  setSelectedRepayBank: (selectedBank: ExtendedBankInfo | null) => void;
  setSelectedBank: (selectedBank: ExtendedBankInfo | null) => void;
};

export const LendingTokens = ({
  selectedBank,
  banks,
  nativeSolBalance,
  actionType,

  setSelectedRepayBank,
  setSelectedBank,
}: LendingTokensProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // idea check list if banks[] == 1 make it unselectable
  const isSelectable = React.useMemo(() => true, []);

  const lendingMode = React.useMemo(
    () => (actionType === ActionType.Deposit ? LendingModes.LEND : LendingModes.BORROW),
    [actionType]
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
        <TokenListWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          Trigger={<LendingTokensTrigger selectedBank={selectedBank} lendingMode={lendingMode} isOpen={isOpen} />}
          Content={
            <LendingTokensList
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              selectedBank={selectedBank}
              onSetSelectedBank={setSelectedBank}
              actionMode={actionType}
              banks={banks}
              nativeSolBalance={nativeSolBalance}
            />
          }
        />
      )}
    </>
  );
};
