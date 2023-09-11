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
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Typography } from "@mui/material";

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
  const { wallet } = useWallet();
  const connection = useConnection();

  useEffect(() => {
    fetchMrgnlendState();
    const id = setInterval(() => fetchMrgnlendState().catch(console.error), 30_000);
    return () => clearInterval(id);
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ crucial to omit both `connection` and `fetchMrgnlendState` from the dependency array
  // TODO: fix...

  const [userPointsData, currentFirebaseUser] = useUserProfileStore((state) => [
    state.userPointsData,
    state.currentFirebaseUser,
  ]);

  console.log({ selectedAccount });

  const healthFactor = useMemo(() => {
    if (selectedAccount) {
      const { assets, liabilities } = selectedAccount.computeHealthComponents(MarginRequirementType.Maintenance);
      return assets.isZero() ? 100 : assets.minus(liabilities).dividedBy(assets).toNumber() * 100;
    } else {
      return null;
    }
  }, [selectedAccount]);

  return (
    <div className="bg-[#171C1F] rounded-xl p-6 flex flex-col gap-[10px] h-full w-full">
      <div className="font-aeonik font-normal flex items-center text-2xl text-white pb-2">Your overview</div>
      <div className="text-center mx-auto">
        <div className={`text-sm font-normal text-[#868E95] pb-4px`}>Health factor</div>
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
                : "P...P...POINTS!"}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
};
