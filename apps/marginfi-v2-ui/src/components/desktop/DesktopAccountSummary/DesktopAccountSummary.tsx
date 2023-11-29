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
  const [isStoreInitialized, accountSummary, protocolStats, selectedAccount] = useMrgnlendStore((state) => [
    state.initialized,
    state.accountSummary,
    state.protocolStats,
    state.selectedAccount,
  ]);
  const { connected } = useWalletContext();

  return (
    <div className={cn("flex flex-col py-[10px] px-4 lg:flex-row w-full justify-between items-center")}>
      <div className="font-[500] lg:block w-full h-[118px]">
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

      <div className="w-full">
        {connected && (
          <div className="font-[500] h-full rounded-xl">
            <span className="w-full h-full flex justify-start text-xl text-white">Your account</span>
            <UserStats
              accountSummary={isStoreInitialized && selectedAccount ? accountSummary : null}
              healthFactor={accountSummary.healthFactor}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export { AccountSummary as DesktopAccountSummary };
