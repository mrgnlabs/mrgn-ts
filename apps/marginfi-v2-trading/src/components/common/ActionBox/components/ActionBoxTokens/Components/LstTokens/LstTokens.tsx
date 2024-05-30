import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { LstType, StakeData } from "~/utils";

import { LstTokenList, LstTokensTrigger } from "./Components";
import { SelectedBankItem, TokenListWrapper } from "../SharedComponents";

type LstTokensProps = {
  lstType: LstType;
  actionMode: ActionType;
  isDialog?: boolean;
  selectedStakingAccount: StakeData | null;
  selectedBank: ExtendedBankInfo | null;
  setSelectedBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  setStakingAccount: (account: StakeData) => void;
};

export const LstTokens = ({
  lstType,
  isDialog,
  selectedBank,
  selectedStakingAccount,
  actionMode,
  setSelectedBank,
  setStakingAccount,
}: LstTokensProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const isSelectable = React.useMemo(() => actionMode !== ActionType.UnstakeLST, [actionMode]);

  return (
    <>
      {!isSelectable ? (
        <div className="flex gap-3 w-full items-center">{selectedBank && <SelectedBankItem bank={selectedBank} />}</div>
      ) : (
        <TokenListWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          Trigger={
            <LstTokensTrigger
              selectedStakingAccount={selectedStakingAccount}
              selectedBank={selectedBank}
              isOpen={isOpen}
            />
          }
          Content={
            <LstTokenList
              selectedBank={selectedBank}
              isOpen={isOpen}
              lstType={lstType}
              onSetSelectedBank={setSelectedBank}
              onSetStakingAccount={setStakingAccount}
              onClose={() => setIsOpen(false)}
            />
          }
        />
      )}
    </>
  );
};
