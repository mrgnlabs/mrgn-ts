import React from "react";

import { ExtendedBankInfo, StakePoolMetadata } from "@mrgnlabs/mrgn-state";
import { cn, LendingModes } from "@mrgnlabs/mrgn-utils";
import { WalletToken } from "@mrgnlabs/mrgn-common";
import { AssetTag } from "@mrgnlabs/marginfi-client-v2";

type SelectedBankItemProps = {
  bank: ExtendedBankInfo | WalletToken;
  stakePoolMetadata?: StakePoolMetadata;
  lendingMode?: LendingModes;
  rate?: string;
};

// Type guard function to check if bank is ExtendedBankInfo
const isExtendedBankInfo = (bank: ExtendedBankInfo | WalletToken): bank is ExtendedBankInfo => {
  return "info" in bank;
};

export const SelectedBankItem = ({ rate, bank, lendingMode, stakePoolMetadata }: SelectedBankItemProps) => {
  // Extract common properties based on bank type
  const { tokenName, tokenSymbol, tokenLogoUri, calculatedApy } = React.useMemo(() => {
    if (isExtendedBankInfo(bank)) {
      // Handle ExtendedBankInfo
      const isStaked = bank.info.rawBank.config.assetTag === AssetTag.STAKED;
      const calculatedApy = isStaked ? stakePoolMetadata?.validatorRewards.toString() : rate;

      return {
        tokenName: bank.meta.tokenName,
        tokenSymbol: bank.meta.tokenSymbol,
        tokenLogoUri: bank.meta.tokenLogoUri,
        calculatedApy,
      };
    } else {
      // Handle WalletToken
      return {
        tokenName: bank.name,
        tokenSymbol: bank.symbol,
        tokenLogoUri: bank.logoUri,
        calculatedApy: rate,
      };
    }
  }, [bank, rate]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tokenLogoUri} alt={tokenName} width={30} height={30} className="rounded-full w-6 h-6" />
      <div className="flex flex-col gap-1 mr-auto xs:mr-0 min-w-14">
        <p className="leading-none text-sm">{tokenSymbol}</p>
        {lendingMode && calculatedApy && (
          <p
            className={cn(
              "text-xs font-normal leading-none",
              lendingMode === LendingModes.LEND && "text-success",
              lendingMode === LendingModes.BORROW && "text-warning"
            )}
          >
            {`${calculatedApy} APY`}
          </p>
        )}
      </div>
    </>
  );
};
