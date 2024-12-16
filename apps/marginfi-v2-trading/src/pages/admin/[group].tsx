import React from "react";

import { useRouter } from "next/router";

import { useTradeStoreV2 } from "~/store";

import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { AdminPoolDetailHeader, AdminPoolDetailCard } from "~/components/common/admin";
import { ArenaPoolV2 } from "~/types/trade-store.types";

export default function AdminGroupDetailsPage() {
  const [initialized, arenaPools, groupsByGroupPk] = useTradeStoreV2((state) => [
    state.initialized,
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
    if (!router.isReady || !initialized) return;

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
  }, [router, ownPools, setActivePool, initialized]);

  return (
    <>
      <div className="w-full space-y-12 max-w-8xl mx-auto px-4 pb-16 pt-8 md:pt-14 min-h-[calc(100vh-100px)]">
        {activePool && <AdminPoolDetailHeader activePool={activePool} />}
        {activePool && <AdminPoolDetailCard key={activePool.groupPk.toBase58()} activePool={activePool} />}
      </div>
    </>
  );
}
