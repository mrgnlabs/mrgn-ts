import React from "react";

import { PublicKey } from "@solana/web3.js";

import { useMrgnlendStore } from "~/store";
import { LstType } from "~/utils";

import { LstTokenList, LstTokensTrigger } from "./Components";
import { TokenListWrapper } from "../SharedComponents";

type LstTokensProps = {
  lstType: LstType;
  currentTokenBank: PublicKey | null;
  setCurrentTokenBank: (selectedTokenBank: PublicKey | null) => void;
};

export const LstTokens = ({ lstType, currentTokenBank, setCurrentTokenBank }: LstTokensProps) => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos, state.nativeSolBalance]);

  const [isOpen, setIsOpen] = React.useState(false);

  const selectedBank = React.useMemo(
    () =>
      currentTokenBank
        ? extendedBankInfos.find((bank) => bank?.address?.equals && bank?.address?.equals(currentTokenBank))
        : null,
    [extendedBankInfos, currentTokenBank]
  );

  return (
    <TokenListWrapper
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      Trigger={
        <LstTokensTrigger selectedTokenBank={currentTokenBank} selectedBank={selectedBank ?? null} isOpen={isOpen} />
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
  );
};
