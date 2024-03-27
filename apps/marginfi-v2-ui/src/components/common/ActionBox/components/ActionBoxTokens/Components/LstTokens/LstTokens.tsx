import React from "react";

import { PublicKey } from "@solana/web3.js";

import { useMrgnlendStore } from "~/store";
import { LstType } from "~/utils";

import { LstTokenList, LstTokensTrigger } from "./Components";
import { SelectedBankItem, TokenListWrapper } from "../SharedComponents";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

type LstTokensProps = {
  lstType: LstType;
  actionMode: ActionType;
  isDialog?: boolean;
  currentTokenBank: PublicKey | null;
  setCurrentTokenBank: (selectedTokenBank: PublicKey | null) => void;
};

export const LstTokens = ({ lstType, isDialog, currentTokenBank, setCurrentTokenBank, actionMode }: LstTokensProps) => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos, state.nativeSolBalance]);

  const [isOpen, setIsOpen] = React.useState(false);

  const isSelectable = React.useMemo(() => actionMode !== ActionType.UnstakeLST, [actionMode]);

  const selectedBank = React.useMemo(
    () =>
      currentTokenBank
        ? extendedBankInfos.find((bank) => bank?.address?.equals && bank?.address?.equals(currentTokenBank))
        : null,
    [extendedBankInfos, currentTokenBank]
  );

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
              selectedTokenBank={currentTokenBank}
              selectedBank={selectedBank ?? null}
              isOpen={isOpen}
            />
          }
          Content={
            <LstTokenList
              selectedBank={selectedBank ?? null}
              onSetCurrentTokenBank={setCurrentTokenBank}
              isOpen={isOpen}
              lstType={lstType}
              onClose={() => setIsOpen(false)}
            />
          }
        />
      )}
    </>
  );
};
