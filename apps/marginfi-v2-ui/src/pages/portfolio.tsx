import React from "react";

import Link from "next/link";

import { useMrgnlendStore, useUserProfileStore, useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";

import { PointsConnectWallet, PointsOverview } from "~/components/common/Points";
import { EmissionsBanner } from "~/components/mobile/EmissionsBanner";
import { Portfolio } from "~/components/common/Portfolio";
import { ActionComplete } from "~/components/common/ActionComplete";
import { Loader } from "~/components/ui/loader";
import { Button } from "~/components/ui/button";
import { IconTrophy } from "~/components/ui/icons";

export default function PortfolioPage() {
  const { connected } = useWalletContext();
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);
  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  return (
    <>
      {!initialized && <Loader label="Loading marginfi portfolio..." className="mt-16" />}
      <div className="flex flex-col max-w-7xl mx-auto w-full h-full justify-start items-center px-4 gap-4 mb-20">
        {initialized && (
          <>
            <EmissionsBanner />
            {!connected ? <PointsConnectWallet /> : <PointsOverview userPointsData={userPointsData} />}
            <Link href="/points">
              <Button>
                <IconTrophy size={16} /> View points leaderboard
              </Button>
            </Link>
            <div className="text-center text-[#868E95] text-xs flex justify-center gap-1">
              <p>We reserve the right to update point calculations at any time.</p>
              <p>
                <Link href="/terms/points" style={{ textDecoration: "underline" }}>
                  Terms.
                </Link>
              </p>
            </div>
            <Portfolio />
          </>
        )}
      </div>
      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}
