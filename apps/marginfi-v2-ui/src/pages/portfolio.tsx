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
            <Portfolio />
          </>
        )}
      </div>
      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}
