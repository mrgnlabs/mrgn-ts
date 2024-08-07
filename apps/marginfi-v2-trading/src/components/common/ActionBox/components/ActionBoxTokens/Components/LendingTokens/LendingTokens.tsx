import React, { act } from "react";

import { PublicKey } from "@solana/web3.js";

import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { RepayType, computeBankRate } from "~/utils";

import { SelectedBankItem, TokenListWrapper } from "../SharedComponents";
import { LendingTokensList, RepayCollatTokensList, LendingTokensTrigger } from "./Components";
import { useTradeStore } from "~/store";
import { GroupData } from "~/store/tradeStore";

type LendingTokensProps = {
  selectedBank: ExtendedBankInfo | null;
  selectedRepayBank: ExtendedBankInfo | null;
  activeGroup: GroupData | null;
  actionType: ActionType;
  isDialog?: boolean;
  isTokenSelectable?: boolean;
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
  activeGroup,
  isDialog,
  isTokenSelectable,
  repayType,
  blacklistRepayTokens = [],
  tokensOverride,

  setSelectedRepayBank,
  setSelectedBank,
}: LendingTokensProps) => {
  const isOtherBankActive = React.useMemo(() => {
    if (!selectedBank || !activeGroup) return false;
    const isToken = activeGroup.pool.token.address.equals(selectedBank.address);
    const isTokenActive = activeGroup.pool.token.isActive;
    const isTokenLending = isTokenActive && activeGroup.pool.token.position.isLending;

    const isQuoteActive = activeGroup.pool.quoteTokens.some((quoteToken) => quoteToken.isActive);
    const isQuoteLending = activeGroup.pool.quoteTokens.some(
      (quoteToken) => quoteToken.isActive && quoteToken.position.isLending
    );

    if (actionType === ActionType.Withdraw) {
      if (isToken && isQuoteActive && isQuoteLending) {
        return true;
      } else if (!isToken && isTokenActive && isTokenLending) {
        return true;
      }
    } else if (actionType === ActionType.Repay) {
      if (isToken && isQuoteActive && !isQuoteLending) {
        return true;
      } else if (!isToken && isTokenActive && !isTokenLending) {
        return true;
      }
    }
    return false;
  }, [actionType, activeGroup, selectedBank]);

  const [isOpen, setIsOpen] = React.useState(false);

  const isSelectable = React.useMemo(
    () => !isDialog || repayType === RepayType.RepayCollat || isOtherBankActive || isTokenSelectable,
    [isDialog, isOtherBankActive, isTokenSelectable, repayType]
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

  console.log("I'm here");

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
                activeGroup={activeGroup}
                tokensOverride={tokensOverride}
              />
            ) : (
              <LendingTokensList
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                selectedBank={selectedBank}
                activeGroup={activeGroup}
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
