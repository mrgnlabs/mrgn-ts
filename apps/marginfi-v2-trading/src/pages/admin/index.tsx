import React from "react";

import { useTradeStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { Loader } from "~/components/common/Loader";
import { AdminPoolCard } from "~/components/common/admin";

export default function AdminPage() {
  const [initialized, groupMap] = useTradeStore((state) => [state.initialized, state.groupMap]);
  const { wallet } = useWallet();

  const ownPools = React.useMemo(() => {
    const goups = [...groupMap.values()];
    return goups.filter((group) => group.client.group.admin.toBase58() === wallet.publicKey?.toBase58());
  }, [groupMap, wallet]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 pb-16 pt-8 md:pt-14 min-h-[calc(100vh-100px)]">
        {!initialized ? (
          <Loader label="Loading the arena..." className="mt-8" />
        ) : ownPools.length > 0 ? (
          <>
            <div className="w-full space-y-2">
              <div className="grid grid-cols-7 w-full text-muted-foreground">
                <div className="pl-5">Asset</div>
                <div className="pl-2.5">Price</div>
                <div className="pl-2">24hr Volume</div>
                <div>Market cap</div>
                <div>Lending pool liquidity</div>
                <div className="pl-2">Created by</div>
                <div />
              </div>
              <div className="bg-background border rounded-xl px-4 py-1">
                {ownPools.map((group, i) => (
                  <AdminPoolCard key={i} groupData={group} last={i === ownPools.length - 1} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center">You aren&apos;t managing any pools</div>
        )}
      </div>
    </>
  );
}
