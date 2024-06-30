import React from "react";

import { PublicKey } from "@solana/web3.js";

import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { RepayType, computeBankRate } from "~/utils";

import { SelectedBankItem, TokenListWrapper } from "../SharedComponents";
import { LendingTokensList, RepayCollatTokensList, LendingTokensTrigger } from "./Components";
import { useTradeStore } from "~/store";

type LendingTokensProps = {
  selectedBank: ExtendedBankInfo | null;
  selectedRepayBank: ExtendedBankInfo | null;
  actionType: ActionType;
  isDialog?: boolean;
  repayType?: RepayType;
  blacklistRepayTokens?: PublicKey[];
  tokensOverride?: ExtendedBankInfo[];

  setSelectedRepayBank: (selectedBank: ExtendedBankInfo | null) => void;
  setSelectedBank: (selectedBank: ExtendedBankInfo | null) => void;
};

export const LendingTokens = ({
  selectedBank,
  selectedRepayBank,
  actionType,
  isDialog,
  repayType,
  blacklistRepayTokens = [],
  tokensOverride,

  setSelectedRepayBank,
  setSelectedBank,
}: LendingTokensProps) => {
  const [activeGroup] = useTradeStore((state) => [state.activeGroup]);

  const isOtherBankActive = React.useMemo(() => {
    if (!selectedBank || !activeGroup) return false;
    const isToken = activeGroup?.token.address.equals(selectedBank.address);
    if (actionType === ActionType.Withdraw) {
      if (isToken && activeGroup.usdc.isActive && activeGroup.usdc.position.isLending) {
        return true;
      } else if (!isToken && activeGroup.token.isActive && activeGroup.token.position.isLending) {
        return true;
      }
    } else if (actionType === ActionType.Repay) {
      if (isToken && activeGroup.usdc.isActive && !activeGroup.usdc.position.isLending) {
        return true;
      } else if (!isToken && activeGroup.token.isActive && !activeGroup.token.position.isLending) {
        return true;
      }
    }
    return false;
  }, [actionType, activeGroup, selectedBank]);

  const [isOpen, setIsOpen] = React.useState(false);

  const isSelectable = React.useMemo(
    () => !isDialog || repayType === RepayType.RepayCollat || isOtherBankActive,
    [isDialog, isOtherBankActive, repayType]
  );

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
          Trigger={
            <LendingTokensTrigger
              selectedBank={selectedBank}
              selectedRepayBank={selectedRepayBank}
              lendingMode={lendingMode}
              isOpen={isOpen}
              repayType={repayType}
            />
          }
          Content={
            repayType === RepayType.RepayCollat ? (
              <RepayCollatTokensList
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSetSelectedRepayBank={setSelectedRepayBank}
                selectedRepayBank={null}
                tokensOverride={tokensOverride}
              />
            ) : (
              <LendingTokensList
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                selectedBank={selectedBank}
                onSetSelectedBank={setSelectedBank}
                isDialog={isDialog}
                actionMode={actionType}
                tokensOverride={tokensOverride}
              />
            )
          }
        />
      )}
    </>
  );
};
