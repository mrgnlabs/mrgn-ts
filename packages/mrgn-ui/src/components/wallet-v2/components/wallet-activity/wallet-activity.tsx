import React from "react";
import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { useWalletActivity } from "../../hooks/use-wallet-activity.hook";
import { useWallet } from "../../hooks/use-wallet.hook";
import { WalletActivityItem, WalletActivityItemSkeleton } from "./components/wallet-activity-item";

type WalletActivityProps = {
  extendedBankInfos: ExtendedBankInfo[];
  onRerun: () => void;
  closeWallet?: () => void;
};

const WalletActivity = ({ extendedBankInfos, onRerun, closeWallet }: WalletActivityProps) => {
  const { connected, walletContextState } = useWallet();
  const { activities, isLoading, error, refetch } = useWalletActivity();

  const banks = React.useMemo(() => {
    return activities.map((activity) => {
      const matchingBank = extendedBankInfos.find((bank) => bank.info.state.mint.toBase58() === activity.details.mint);
      if (!matchingBank) {
        console.warn(`No matching bank found for activity with mint ${activity.details.mint}`);
        return null;
      }
      return matchingBank;
    });
  }, [activities, extendedBankInfos]);

  const secondaryBanks = React.useMemo(() => {
    return activities.map((activity) => {
      const matchingBank = extendedBankInfos.find(
        (bank) => bank.info.state.mint.toBase58() === activity.details.secondaryMint
      );
      return matchingBank || null;
    });
  }, [activities, extendedBankInfos]);

  if (!connected) {
    return <div className="text-sm text-muted-foreground">Connect your wallet to view activity</div>;
  }

  return (
    <div>
      {isLoading ? (
        <div className="space-y-2 h-[calc(100vh-190px)] overflow-y-auto">
          {Array.from({ length: 10 }).map((_, index) => (
            <WalletActivityItemSkeleton key={index} style={{ opacity: (10 - index) * 0.1 }} />
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-500">Error loading activities: {error}</div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center">
          No activity yet, start using marginfi
          <br /> and track your activity here.
        </p>
      ) : (
        <div className="space-y-2 h-[calc(100vh-190px)] overflow-y-auto">
          {activities.map((activity, index) => {
            const bank = banks[index];
            const secondaryBank = secondaryBanks[index];

            if (!bank) return null;
            return (
              <WalletActivityItem
                key={index}
                activity={activity}
                bank={bank}
                secondaryBank={secondaryBank || undefined}
                walletContextState={walletContextState as WalletContextStateOverride}
                onRerun={() => {
                  onRerun();
                  setTimeout(() => refetch(), 2000);
                }}
                closeWallet={closeWallet}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export { WalletActivity };
