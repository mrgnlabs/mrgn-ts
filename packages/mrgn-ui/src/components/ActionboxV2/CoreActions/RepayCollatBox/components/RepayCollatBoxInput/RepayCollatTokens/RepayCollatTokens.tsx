import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem, TokenListWrapper } from "~/components/ActionboxV2/sharedComponents";

import { RepayCollatTokensList } from "./RepayCollatTokensList";
import { RepayCollatTokensTrigger } from "./RepayCollatTokensTrigger";

interface RepayCollatTokensProps {
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;

  setTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  setSecondaryTokenBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
}

export const RepayCollatTokens = ({
  selectedBank,
  selectedSecondaryBank,
  banks,
  nativeSolBalance,

  setSecondaryTokenBank,
}: RepayCollatTokensProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // idea check list if banks[] == 1 make it unselectable
  const isSelectable = React.useMemo(() => true, []);

  const calculateRate = React.useCallback((bank: ExtendedBankInfo) => {
    return computeBankRate(bank, LendingModes.BORROW);
  }, []);

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
        <TokenListWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          Trigger={
            <RepayCollatTokensTrigger bank={selectedSecondaryBank} lendingMode={LendingModes.BORROW} isOpen={isOpen} />
          }
          Content={
            <RepayCollatTokensList
              banks={banks}
              nativeSolBalance={nativeSolBalance}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onSetSelectedSecondaryBank={setSecondaryTokenBank}
              selectedSecondaryBank={selectedSecondaryBank}
            />
          }
        />
      )}
    </>
  );
};
