import React from "react";
import Link from "next/link";

import { useWallet } from "@mrgnlabs/mrgn-ui";

import { PointsOverview, PointsConnectWallet } from "~/components/common/Points";
import { Loader } from "~/components/ui/loader";
import { PointsTable } from "~/components/desktop/Points";
import { useUserProfileStore } from "~/store";

export default function PointsPage() {
  const { connected } = useWallet();
  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData]);

  return (
    <>
      {!userPointsData && <Loader label="Loading marginfi points..." className="mt-16" />}

      {userPointsData && (
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
