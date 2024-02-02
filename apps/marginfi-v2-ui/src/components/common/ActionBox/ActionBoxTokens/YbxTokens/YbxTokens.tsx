import React from "react";

import { PublicKey } from "@solana/web3.js";

import { useMrgnlendStore } from "~/store";

import { SelectedBankItem } from "../SharedComponents";

type LstTokensProps = {
  currentTokenBank: PublicKey | null;
};

export const YbxTokens = ({ currentTokenBank }: LstTokensProps) => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const selectedBank = React.useMemo(
    () =>
      currentTokenBank
        ? extendedBankInfos.find((bank) => bank?.address?.equals && bank?.address?.equals(currentTokenBank))
        : null,
    [extendedBankInfos, currentTokenBank]
  );

  return (
    <>
      <div className="flex gap-3 w-full items-center">{selectedBank && <SelectedBankItem bank={selectedBank} />}</div>
    </>
  );
};
