import { useWallet } from "@solana/wallet-adapter-react";
import React, { FC } from "react";
import { GlobalStats } from "./GlobalStats";
import { UserStats } from "./UserStats";
import { useMrgnlendStore } from "~/store";

const AccountSummary: FC = () => {
  const [accountSummary, protocolStats, selectedAccount] = useMrgnlendStore((state) => [
    state.accountSummary,
    state.protocolStats,
    state.selectedAccount,
  ]);
  const wallet = useWallet();

  return (
    <div className="flex flex-col lg:flex-row w-full h-full justify-between items-center">
      <div className="hidden lg:block w-full">
        <GlobalStats
          tvl={protocolStats.tvl}
          pointsTotal={protocolStats.pointsTotal}
          borrows={protocolStats.borrows}
          deposits={protocolStats.deposits}
        />
      </div>

      <div className="w-full">
        {wallet.connected && !!selectedAccount && (
          <UserStats accountSummary={accountSummary} healthFactor={accountSummary.healthFactor} />
        )}
      </div>
    </div>
  );
};

export { AccountSummary };
