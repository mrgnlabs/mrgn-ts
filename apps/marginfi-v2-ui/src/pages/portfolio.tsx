import React from "react";

import Link from "next/link";

import { useMrgnlendStore, useUserProfileStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";

import { PageHeader } from "~/components/common/PageHeader";
import { PointsConnectWallet, PointsOverview } from "~/components/common/Points";
import { EmissionsBanner } from "~/components/mobile/EmissionsBanner";
import { Portfolio } from "~/components/common/Portfolio";
import { Loader } from "~/components/ui/loader";

export default function PortfolioPage() {
  const { connected } = useWalletContext();
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);
  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData]);

  return (
    <>
      <PageHeader>portfolio</PageHeader>
      <div className="flex flex-col w-full h-full justify-start items-center px-4 gap-6 mb-20">
        {!initialized && <Loader label="Loading marginfi points..." className="mt-16" />}

        {initialized && (
          <>
            <EmissionsBanner />
            {!connected ? <PointsConnectWallet /> : <PointsOverview userPointsData={userPointsData} />}
            <div className="text-center text-[#868E95] text-xs flex justify-center gap-1">
              <div>We reserve the right to update point calculations at any time.</div>
              <div>
                <Link href="/terms/points" style={{ textDecoration: "underline" }}>
                  Terms.
                </Link>
              </div>
            </div>
            <Portfolio />
          </>
        )}
      </div>
    </>
  );
}
