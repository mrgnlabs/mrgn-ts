import React from "react";

import Image from "next/image";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { cn, getTokenImageURL } from "~/utils";

type SelectedBankItemProps = {
  bank: ExtendedBankInfo;
  lendingMode?: LendingModes;
  rate?: string;
};

export const SelectedBankItem = ({ rate, bank, lendingMode }: SelectedBankItemProps) => {
  return (
    <>
      <Image
        src={getTokenImageURL(bank.meta.tokenSymbol)}
        alt={bank.meta.tokenName}
        width={30}
        height={30}
        className="rounded-full"
      />
      <div className="flex flex-col gap-1 mr-auto xs:mr-0 min-w-14">
        <p className="leading-none text-sm">{bank.meta.tokenSymbol}</p>
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
