import React, { FC } from "react";
import dynamic from "next/dynamic";

import { useMrgnlendStore } from "~/store";

const GlobalStats = dynamic(async () => (await import("~/components/common/AccountSummary/GlobalStats")).GlobalStats, {
  ssr: false,
});

const AccountSummary: FC = () => {
  const [protocolStats] = useMrgnlendStore((state) => [state.protocolStats]);

  return (
    <div className="flex flex-col w-full justify-between items-left gap-4  max-w-[900px]">
      <div className="lg:block flex-1">
        <div className="h-full rounded-xl">
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

export { AccountSummary as MobileAccountSummary };
