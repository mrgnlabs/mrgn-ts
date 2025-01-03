import React from "react";

import { useRouter } from "next/router";

import { useTradeStoreV2 } from "~/store";

import { AdminPoolDetailHeader, AdminPoolDetailCard } from "~/components/common/admin";
import { ArenaPoolV2 } from "~/types/trade-store.types";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { GeoBlockingWrapper } from "~/components/common/geo-blocking-wrapper";

export default function AdminGroupDetailsPage() {
  const [initialized, poolsFetched, arenaPools, groupsByGroupPk] = useTradeStoreV2((state) => [
    state.initialized,
    state.poolsFetched,
    state.arenaPools,
    state.groupsByGroupPk,
  ]);
  const { wallet } = useWallet();
  const router = useRouter();
  const [activePool, setActivePool] = React.useState<ArenaPoolV2 | null>(null);

  const ownPools = React.useMemo(() => {
    const pools = Object.values(arenaPools);
    return pools.filter(
      (pool) => groupsByGroupPk[pool.groupPk.toBase58()]?.admin.toBase58() === wallet.publicKey?.toBase58()
    );
  }, [arenaPools, groupsByGroupPk, wallet]);

  React.useEffect(() => {
    if (!router.isReady || !initialized || !poolsFetched) return;

    const group = router.query.group as string;

    if (!group) {
      router.push("/404");
      return;
    }

    const data = ownPools.find((pool) => pool.groupPk.toBase58() === group);
    if (!data) {
      router.push("/404");
      return;
    }

    setActivePool(data);
  }, [router, ownPools, setActivePool, initialized, poolsFetched]);

  return (
    <GeoBlockingWrapper>
      <div className="w-full space-y-12 max-w-6xl mx-auto px-4 pb-16 pt-8 md:pt-14 min-h-[calc(100vh-100px)] mb-4 sm:mb-0">
        {activePool && <AdminPoolDetailHeader activePool={activePool} />}
        {activePool && <AdminPoolDetailCard activePool={activePool} />}
      </div>
    </GeoBlockingWrapper>
  );
}
