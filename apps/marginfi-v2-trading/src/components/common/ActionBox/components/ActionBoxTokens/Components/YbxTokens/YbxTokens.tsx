import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { SelectedBankItem } from "../SharedComponents";

type LstTokensProps = {
  selectedBank: ExtendedBankInfo | null;
};

export const YbxTokens = ({ selectedBank }: LstTokensProps) => {
  return (
    <>
      <div className="flex gap-3 w-full items-center">{selectedBank && <SelectedBankItem bank={selectedBank} />}</div>
    </>
  );
};
