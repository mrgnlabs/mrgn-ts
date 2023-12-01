import React from "react";

import dynamic from "next/dynamic";

import { useMrgnlendStore } from "~/store";
import { cn } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { UserStats } from "~/components/common/AccountSummary";

const GlobalStats = dynamic(async () => (await import("~/components/common/AccountSummary/GlobalStats")).GlobalStats, {
  ssr: false,
});

const AccountSummary = () => {
  const [protocolStats] = useMrgnlendStore((state) => [state.protocolStats]);

  return (
    <div className={cn("flex flex-col py-[10px] px-4 lg:flex-row w-full justify-between items-center")}>
      <div className="font-[500] lg:block w-full">
        <div className="h-full rounded-xl">
          <span className="w-full flex justify-start text-xl">Global stats</span>
          <GlobalStats
            tvl={protocolStats.tvl}
            pointsTotal={protocolStats.pointsTotal}
            borrows={protocolStats.borrows}
            deposits={protocolStats.deposits}
          />
        </div>
      </div>
    </div>
  );
};

export { AccountSummary as DesktopAccountSummary };
