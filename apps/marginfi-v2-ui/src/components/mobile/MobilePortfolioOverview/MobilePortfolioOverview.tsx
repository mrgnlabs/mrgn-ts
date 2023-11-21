import React, { FC, useMemo } from "react";
import { Typography } from "@mui/material";

import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { usdFormatterDyn, usdFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";

import { useMrgnlendStore, useUserProfileStore } from "~/store";

import { SemiCircleProgress } from "./SemiCircleProgress";

export const MobilePortfolioOverview: FC = () => {
  const [selectedAccount, accountSummary] = useMrgnlendStore((state) => [state.selectedAccount, state.accountSummary]);

  const [userPointsData, currentFirebaseUser] = useUserProfileStore((state) => [
    state.userPointsData,
    state.currentFirebaseUser,
  ]);

  const healthFactor = useMemo(() => {
    if (selectedAccount) {
      const { assets, liabilities } = selectedAccount.computeHealthComponents(MarginRequirementType.Maintenance);
      return assets.isZero() ? 100 : assets.minus(liabilities).dividedBy(assets).toNumber() * 100;
    } else {
      return null;
    }
  }, [selectedAccount]);

  return (
    <div className="max-w-[800px] mx-auto w-full bg-[#1A1F22] rounded-xl p-6 flex flex-col gap-[10px] h-full">
      <div className="font-aeonik font-normal flex items-center text-2xl text-white pb-2">Your overview</div>
      <div className="text-center mx-auto">
        <div className={`text-sm font-normal text-[#868E95] pb-[4px]`}>Health factor</div>
        <SemiCircleProgress amount={healthFactor ?? 0} />
      </div>
      <div className="flex flex-row pt-[10px] flex-wrap gap-[10px]">
        <div className="flex flex-col grow gap-2">
          <div>
            <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
              Supplied
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-lg">
              {accountSummary &&
                (Math.round(accountSummary.lendingAmountUnbiased) > 10000
                  ? usdFormatterDyn.format(Math.round(accountSummary.lendingAmountUnbiased))
                  : usdFormatter.format(accountSummary.lendingAmountUnbiased))}
            </Typography>
          </div>
          <div>
            <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
              Borrowed
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-lg">
              {accountSummary &&
                (Math.round(accountSummary.borrowingAmountUnbiased) > 10000
                  ? usdFormatterDyn.format(Math.round(accountSummary.borrowingAmountUnbiased))
                  : usdFormatter.format(accountSummary.borrowingAmountUnbiased))}
            </Typography>
          </div>
        </div>
        <div className="flex flex-col grow gap-2">
          <div>
            <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
              Free Collateral
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-lg">
              {accountSummary && usdFormatter.format(accountSummary.signedFreeCollateral)}
            </Typography>
          </div>
          <div>
            <Typography color="#868E95" className="font-aeonik font-[300] text-xs flex gap-1" gutterBottom>
              Points
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-lg">
              {!!currentFirebaseUser
                ? `${groupedNumberFormatterDyn.format(Math.round(userPointsData.totalPoints))} points`
                : "-"}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
};
