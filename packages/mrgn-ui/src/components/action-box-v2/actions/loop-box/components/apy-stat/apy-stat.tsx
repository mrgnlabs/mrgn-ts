import React from "react";
import Image from "next/image";

import { calcNetLoopingApy, cn, computeBankRateRaw, LendingModes } from "@mrgnlabs/mrgn-utils";
import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { percentFormatter } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";

type ApyStatProps = {
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  leverageAmount: number;
  depositLstApy: number | null;
  borrowLstApy: number | null;
  depositEmissionsRate: number | null;
};

const JITO_BANK = new PublicKey("Bohoc1ikHLD7xKJuzTyiTyCwzaL5N7ggJQu75A8mKYM8");
const SOL_BANK = new PublicKey("CCKtUs6Cgwo4aaQUmBPmyoApH2gUDErxNZCAntD6LYGh");
const JTO_MINT = "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL";

export const ApyStat = ({
  selectedBank,
  selectedSecondaryBank,
  leverageAmount,
  depositLstApy,
  borrowLstApy,
  depositEmissionsRate,
}: ApyStatProps) => {
  const [apyOverview, setApyOverview] = React.useState<{
    totalDepositApy: number;
    totalBorrowApy: number;
    totalDepositLstApy: number;
    totalBorrowLstApy: number;
    netApyRaw: number;
    netApy: string;
  } | null>(null);

  const updateApyOverview = React.useCallback(
    (bank: ExtendedBankInfo, secondaryBank: ExtendedBankInfo) => {
      const {
        totalDepositApy,
        totalBorrowApy,
        depositLstApy: totalDepositLstApy,
        borrowLstApy: totalBorrowLstApy,
        netApy,
      } = calcNetLoopingApy(bank, secondaryBank, depositLstApy ?? 0, borrowLstApy ?? 0, leverageAmount);

      // Scale emissions rate by leverage amount (similar to how deposit APY is scaled)
      const scaledEmissionsRate = (depositEmissionsRate ?? 0) * leverageAmount;

      // Add emissions rate to the net APY
      const netApyWithEmissions = netApy + scaledEmissionsRate;

      setApyOverview({
        totalDepositApy,
        totalBorrowApy,
        totalDepositLstApy,
        totalBorrowLstApy,
        netApyRaw: netApyWithEmissions,
        netApy: percentFormatter.format(Math.abs(netApyWithEmissions)),
      });
    },
    [borrowLstApy, depositLstApy, leverageAmount, depositEmissionsRate]
  );

  React.useEffect(() => {
    if (!selectedBank || !selectedSecondaryBank) {
      setApyOverview(null);
      return;
    }

    updateApyOverview(selectedBank, selectedSecondaryBank);
  }, [leverageAmount, selectedBank, selectedSecondaryBank, updateApyOverview]);

  const bothBanksSelected = React.useMemo(
    () => Boolean(selectedBank && selectedSecondaryBank),
    [selectedBank, selectedSecondaryBank]
  );

  if (!bothBanksSelected || !apyOverview || !selectedBank || !selectedSecondaryBank) {
    return null;
  }

  // Get base rates for display when leverage is 0 or less than 1
  const getDisplayRate = (isDepositBank: boolean) => {
    if (leverageAmount <= 1) {
      // Get base rate directly from bank data
      const bank = isDepositBank ? selectedBank : selectedSecondaryBank;
      return computeBankRateRaw(bank, isDepositBank ? LendingModes.LEND : LendingModes.BORROW);
    }
    return isDepositBank ? apyOverview.totalDepositApy : apyOverview.totalBorrowApy;
  };

  // Get base LST rates for display when leverage is 0 or less than 1
  const getDisplayLstRate = (isDepositBank: boolean) => {
    if (leverageAmount <= 1) {
      // Show base LST rate when leverage is 0 or 1
      return isDepositBank ? (depositLstApy ?? 0) : (borrowLstApy ?? 0);
    }
    return isDepositBank ? apyOverview.totalDepositLstApy : apyOverview.totalBorrowLstApy;
  };

  return (
    <div className="space-y-3">
      <div className="text-xs space-y-2.5">
        {[selectedBank, selectedSecondaryBank].map((bank, index) => {
          const isDepositBank = index === 0;
          return (
            <React.Fragment key={bank.meta.tokenSymbol}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <Image
                    src={bank.meta.tokenLogoUri}
                    width={16}
                    height={16}
                    alt={bank.meta.tokenName}
                    className="rounded-full"
                  />
                  <div className="text-muted-foreground">
                    <span>{bank.meta.tokenSymbol}</span> {isDepositBank ? "lending" : "borrowing"} rate
                  </div>
                </div>
                <span className={cn("ml-auto", isDepositBank ? "text-success" : "text-warning")}>
                  {percentFormatter.format(getDisplayRate(isDepositBank))}
                </span>
              </div>

              {isDepositBank &&
                depositEmissionsRate &&
                selectedBank.address.equals(JITO_BANK) &&
                selectedSecondaryBank.address.equals(SOL_BANK) && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <Image
                        src={`https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${JTO_MINT}.png`}
                        width={16}
                        height={16}
                        alt={"JTO"}
                        className="rounded-full"
                      />
                      <div className="text-muted-foreground">
                        <span>JTO</span> emissions rate
                      </div>
                    </div>
                    <span className="text-success text-right">
                      {percentFormatter.format(depositEmissionsRate * (leverageAmount <= 1 ? 1 : leverageAmount))}
                    </span>
                  </div>
                )}

              {isDepositBank && depositEmissionsRate && !selectedBank.address.equals(JITO_BANK) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <Image
                      src={bank.meta.tokenLogoUri}
                      width={16}
                      height={16}
                      alt={bank.meta.tokenName}
                      className="rounded-full"
                    />
                    <div className="text-muted-foreground">
                      <span>{bank.meta.tokenSymbol}</span> emissions rate
                    </div>
                  </div>
                  <span className="text-success text-right">
                    {percentFormatter.format(depositEmissionsRate * (leverageAmount <= 1 ? 1 : leverageAmount))}
                  </span>
                </div>
              )}

              {isDepositBank && depositLstApy !== null && depositLstApy > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <Image
                      src={bank.meta.tokenLogoUri}
                      width={16}
                      height={16}
                      alt={bank.meta.tokenName}
                      className="rounded-full"
                    />
                    <div className="text-muted-foreground">
                      <span>{bank.meta.tokenSymbol}</span> staking rate
                    </div>
                  </div>
                  <span className="text-success text-right">
                    {percentFormatter.format(getDisplayLstRate(isDepositBank))}
                  </span>
                </div>
              )}

              {!isDepositBank && borrowLstApy !== null && borrowLstApy > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bank.meta.tokenLogoUri}
                      width={16}
                      height={16}
                      alt={bank.meta.tokenName}
                      className="rounded-full"
                    />
                    <div className="text-muted-foreground">
                      <span>{bank.meta.tokenSymbol}</span> staking rate
                    </div>
                  </div>
                  <span className="text-warning text-right">
                    {percentFormatter.format(getDisplayLstRate(isDepositBank))}
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="border-t border-accent pt-2.5">
        <div className="flex items-center justify-between">
          <div className="text-xs flex items-center gap-1 -translate-x-1.5">
            <div className="flex items-center -space-x-1.5">
              <Image
                src={selectedBank.meta.tokenLogoUri}
                width={16}
                height={16}
                alt={selectedBank.meta.tokenName}
                className="rounded-full"
              />
              <Image
                src={selectedSecondaryBank.meta.tokenLogoUri}
                width={16}
                height={16}
                alt={selectedSecondaryBank.meta.tokenName}
                className="rounded-full"
              />
            </div>
            {selectedBank.meta.tokenSymbol} / {selectedSecondaryBank.meta.tokenSymbol} APY
          </div>
          <span className={cn("text-xs", apyOverview.netApyRaw < 0 ? "text-warning" : "text-success")}>
            {apyOverview.netApy}
          </span>
        </div>
      </div>
    </div>
  );
};
