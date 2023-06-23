import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AccountSummary, AssetsList, MultipleAccountsFoundWarning, UserPositions } from "~/components";
import { PointsSummary } from "~/components/points/PointsSummary";
import { Leaderboard } from '~/components/points/Leaderboard';
import { PageHeader } from "~/components/PageHeader";
import { useUserAccounts } from "~/context";

const Points = () => {
  const wallet = useWallet();

  return (
    <>
      <PageHeader />
      <div className="flex flex-col justify-start content-start py-[64px] grid w-4/5 max-w-7xl gap-4 grid-cols-1 xl:grid-cols-2">
        <PointsSummary />
        <PointsSummary />
        <Leaderboard />
      </div>
    </>
  );
};

export default Points;
