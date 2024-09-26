import React from "react";

import Link from "next/link";

import { useMrgnlendStore, useUserProfileStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { PointsOverview, PointsConnectWallet } from "~/components/common/Points";
import { PointsTable } from "~/components/desktop/Points";
import { Loader } from "~/components/ui/loader";

export default function PointsPage() {
  const { connected } = useWallet();

  const [initialized] = useMrgnlendStore((state) => [state.initialized]);

  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData]);

  return (
    <>
      {!initialized && <Loader label="Loading marginfi points..." className="mt-16" />}

      {initialized && (
        <div className="flex flex-col items-center w-full max-w-8xl px-4 md:px-10 gap-5 pb-[64px] sm:pb-[32px]">
          {!connected ? <PointsConnectWallet /> : <PointsOverview userPointsData={userPointsData} />}
          <div className="text-muted-foreground text-xs">
            <p>
              We reserve the right to update point calculations at any time.{" "}
              <Link
                href="/terms/points"
                className="border-b border-muted-foreground/40 transition-colors hover:border-transparent"
              >
                Terms.
              </Link>
            </p>
          </div>
          <PointsTable userPointsData={userPointsData} />
        </div>
      )}
    </>
  );
}
