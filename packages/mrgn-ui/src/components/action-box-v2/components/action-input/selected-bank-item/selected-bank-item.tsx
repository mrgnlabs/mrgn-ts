import React from "react";

import { ExtendedBankInfo, StakePoolMetadata } from "@mrgnlabs/mrgn-state";
import { cn, LendingModes } from "@mrgnlabs/mrgn-utils";
import { WalletToken } from "@mrgnlabs/mrgn-common";
import { AssetTag } from "@mrgnlabs/marginfi-client-v2";

type SelectedBankItemProps = {
  bank: ExtendedBankInfo | WalletToken;
  lendingMode?: LendingModes;
  rate?: string;
  includesEmissionsRate?: boolean;
};

// Type guard function to check if bank is ExtendedBankInfo
const isExtendedBankInfo = (bank: ExtendedBankInfo | WalletToken): bank is ExtendedBankInfo => {
  return "info" in bank;
};

export const SelectedBankItem = ({ rate, bank, lendingMode, includesEmissionsRate }: SelectedBankItemProps) => {
  // Extract common properties based on bank type
  const { tokenName, tokenSymbol, tokenLogoUri } = React.useMemo(() => {
    if (isExtendedBankInfo(bank)) {
      return {
        tokenName: bank.meta.tokenName,
        tokenSymbol: bank.meta.tokenSymbol,
        tokenLogoUri: bank.meta.tokenLogoUri,
      };
    } else {
      // Handle WalletToken
      return {
        tokenName: bank.name,
        tokenSymbol: bank.symbol,
        tokenLogoUri: bank.logoUri,
      };
    }
  }, [bank]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tokenLogoUri} alt={tokenName} width={30} height={30} className="rounded-full w-6 h-6" />
      <div className="flex flex-col gap-1 mr-auto xs:mr-0 min-w-14">
        <p className="leading-none text-sm">{tokenSymbol}</p>
        {lendingMode && rate && (
          <p
            className={cn(
              "text-xs font-normal leading-none",
              lendingMode === LendingModes.LEND && "text-success",
              lendingMode === LendingModes.BORROW && "text-warning",
              includesEmissionsRate && "border-b border-dashed border-blue-400"
            )}
          >
            {`${rate} APY`}
          </p>
        )}
      </div>
    </>
  );
};
