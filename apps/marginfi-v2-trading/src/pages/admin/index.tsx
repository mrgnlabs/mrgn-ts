import React from "react";

import { useTradeStoreV2 } from "~/store";

import { Loader } from "~/components/common/Loader";
import { AdminPoolCard } from "~/components/common/admin";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

export default function AdminPage() {
  const [poolsfetched, arenaPools, groupsByGroupPk] = useTradeStoreV2((state) => [
    state.poolsFetched,
    state.arenaPools,
    state.groupsByGroupPk,
  ]);

  const { wallet } = useWallet();

  const ownPools = React.useMemo(() => {
    const pools = Object.values(arenaPools);
    return pools.filter(
      (pool) => groupsByGroupPk[pool.groupPk.toBase58()]?.admin.toBase58() === wallet.publicKey?.toBase58()
    );
  }, [arenaPools, groupsByGroupPk, wallet]);

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-4 py-12 min-h-[calc(100vh-100px)]">
        {!poolsfetched ? (
          <Loader label="Loading your pools..." className="mt-8" />
        ) : ownPools.length > 0 ? (
          <>
            <div className="text-center space-y-2 mb-12 text-lg">
              <h1 className="text-4xl font-medium">Manage your Arena pools</h1>
              <p className="text-muted-foreground">View your pool details and provide liquidity.</p>
            </div>
            <div className="w-full space-y-2 mt-16">
              <div className="grid-cols-2 md:grid-cols-6 gap-4 w-full text-muted-foreground hidden md:grid">
                <div className="pl-5 col-span-2">Pool</div>
                <div className="pl-2.5">Price</div>
                <div className="pl-2">24hr Volume</div>
                {/* <div>Token liquidity</div>
                <div>pool liquidity</div> */}
                <div>Created by</div>
                <div />
              </div>
              <div className="bg-background border rounded-xl px-4 py-1">
                {ownPools.map((pool, i) => (
                  <AdminPoolCard key={i} pool={pool} last={i === ownPools.length - 1} />
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
