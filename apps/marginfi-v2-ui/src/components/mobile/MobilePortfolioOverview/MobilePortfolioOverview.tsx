import { FC, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMrgnlendStore, useUserProfileStore } from "~/store";
import { useRouter } from "next/router";
import { useFirebaseAccount } from "~/hooks/useFirebaseAccount";
import { useWalletContext } from "~/hooks/useWalletContext";

import { MarginRequirementType, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, UserPointsData } from "@mrgnlabs/marginfi-v2-ui-state";
import { usdFormatterDyn, usdFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { SemiCircleProgress } from "./SemiCircleProgress";

// @todo implement second pretty navbar row
export const MobilePortfolioOverview: FC = () => {
  const [
    marginfiClient,
    fetchMrgnlendState,
    selectedAccount,
    accountSummary,
    extendedBankInfos,
    nativeSolBalance,
    protocolStats,
  ] = useMrgnlendStore((state) => [
    state.marginfiClient,
    state.fetchMrgnlendState,
    state.selectedAccount,
    state.accountSummary,
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.protocolStats,
  ]);

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

  const labelStyle = `text-sm font-normal text-[#868E95]`;
  const valueStyle = `text-xl font-bold text-[#FFF]`;

  return (
    <div className="bg-[#1C2125] rounded-xl px-[12px] py-[16px] flex flex-col gap-[10px] h-[500px] w-[500px]">
      <div className="bg-[#1C2125] rounded-xl text-2xl font-bold text-primary">Your overview</div>
      <div className="text-center mx-auto ">
        <div className={`${labelStyle} pb-4px`}>Health factor</div>
        <SemiCircleProgress amount={healthFactor ?? 0} />
      </div>
      <div className="flex flex-row pt-10px flex-wrap gap-10px">
        <div className="flex flex-col grow gap-10px">
          <div>
            <div className={`${labelStyle} pb-4px`}>Supplied</div>
            <div className="[valueStyle">
              {accountSummary &&
                (Math.round(accountSummary.lendingAmountUnbiased) > 10000
                  ? usdFormatterDyn.format(Math.round(accountSummary.lendingAmountUnbiased))
                  : usdFormatter.format(accountSummary.lendingAmountUnbiased))}
            </div>
          </div>
          <div>
            <div className={`${labelStyle} pb-4px`}>Borrowed</div>
            <div className="[valueStyle">
              {accountSummary &&
                (Math.round(accountSummary.borrowingAmountUnbiased) > 10000
                  ? usdFormatterDyn.format(Math.round(accountSummary.borrowingAmountUnbiased))
                  : usdFormatter.format(accountSummary.borrowingAmountUnbiased))}
            </div>
          </div>
        </div>
        <div className="flex flex-col grow gap-10px">
          <div>
            <div className={`${labelStyle} pb-4px`}>Free Collateral</div>
            <div className="[valueStyle">
              {accountSummary && usdFormatter.format(accountSummary.signedFreeCollateral)}
            </div>
          </div>
          <div>
            <div className={`${labelStyle} pb-4px`}>Points</div>
            <div className="[valueStyle">
              {!!currentFirebaseUser
                ? `${groupedNumberFormatterDyn.format(Math.round(userPointsData.totalPoints))} points`
                : "P...P...POINTS!"}
            </div>
          </div>
        </div>
        {/* <div className="flex basis-full gap-10px">
              <div>
                <div className="[labelStyle, tw`pb-4px`">Points</Text>
                <div className="[valueStyle">60 points</Text>
              </div>
            </div> */}
      </div>
    </div>
  );
};
