import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, LendingModes } from "@mrgnlabs/mrgn-utils";
import { WalletToken } from "@mrgnlabs/mrgn-common";

type SelectedBankItemProps = {
  bank: ExtendedBankInfo | WalletToken;
  lendingMode?: LendingModes;
  rate?: string;
};

export const SelectedBankItem = ({ rate, bank, lendingMode }: SelectedBankItemProps) => {
  const tokenName = "info" in bank ? bank.meta.tokenName : bank.name;
  const tokenSymbol = "info" in bank ? bank.meta.tokenSymbol : bank.symbol;
  const tokenLogoUri = "info" in bank ? bank.meta.tokenLogoUri : bank.logoUri;
  return (
    <>
      <img src={tokenLogoUri} alt={tokenName} width={30} height={30} className="rounded-full w-6 h-6" />
      <div className="flex flex-col gap-1 mr-auto xs:mr-0 min-w-14">
        <p className="leading-none text-sm">{tokenSymbol}</p>
        {lendingMode && rate && (
          <p
            className={cn(
              "text-xs font-normal leading-none",
              lendingMode === LendingModes.LEND && "text-success",
              lendingMode === LendingModes.BORROW && "text-warning"
            )}
          >
            {`${rate} APY`}
          </p>
        )}
      </div>
    </>
  );
};
