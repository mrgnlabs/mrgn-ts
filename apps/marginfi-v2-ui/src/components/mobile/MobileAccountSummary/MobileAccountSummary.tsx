import React, { FC } from "react";
import { useMrgnlendStore } from "~/store";
import dynamic from "next/dynamic";
import { useWalletContext } from "~/hooks/useWalletContext";
import { UserStats } from "~/components/common/AccountSummary";

const GlobalStats = dynamic(async () => (await import("~/components/common/AccountSummary/GlobalStats")).GlobalStats, {
  ssr: false,
});

const AccountSummary: FC = () => {
  const [isStoreInitialized, accountSummary, protocolStats, selectedAccount] = useMrgnlendStore((state) => [
    state.initialized,
    state.accountSummary,
    state.protocolStats,
    state.selectedAccount,
  ]);
  const { connected } = useWalletContext();

  return (
    <div className="flex flex-row w-full justify-between items-center ">
      <div className="lg:block w-full h-[70px] ">
        <GlobalStats
          tvl={protocolStats.tvl}
          pointsTotal={protocolStats.pointsTotal}
          borrows={protocolStats.borrows}
          deposits={protocolStats.deposits}
        />
      </div>

      {/* <div className="w-full">
        {connected && (
          <UserStats
            accountSummary={isStoreInitialized && selectedAccount ? accountSummary : null}
            healthFactor={accountSummary.healthFactor}
          />
        )}
      </div> */}
    </div>
  );
};

export { AccountSummary as MobileAccountSummary };
