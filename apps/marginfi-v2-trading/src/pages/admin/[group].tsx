import React from "react";

import { useRouter } from "next/router";

import { useTradeStore, useUiStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { GroupData } from "~/store/tradeStore";
import { useIsMobile } from "~/hooks/use-is-mobile";

import { Wallet } from "~/components/wallet-v2";
import { ActionComplete } from "~/components/common/ActionComplete";
import { TVWidget } from "~/components/common/TVWidget";
import { TradingBox } from "~/components/common/TradingBox";
import { PositionList } from "~/components/common/Portfolio";
import { PoolTradeHeader } from "~/components/common/Pool/PoolTradeHeader";
import { Loader } from "~/components/common/Loader";
import { ManagePoolCard, ManagePoolDetailHeader, PoolDetailCard } from "~/components/common/admin";
import { YieldCard } from "~/components/common/Yield/YieldCard";

export default function AdminGroupDetailsPage() {
  const [initialized, groupMap, currentPage, totalPages, setCurrentPage, sortBy, setSortBy] = useTradeStore((state) => [
    state.initialized,
    state.groupMap,
    state.currentPage,
    state.totalPages,
    state.setCurrentPage,
    state.sortBy,
    state.setSortBy,
  ]);
  const { wallet } = useWallet();
  const router = useRouter();
  const [activeGroup, setActiveGroup] = React.useState<GroupData | null>(null);

  const ownPools = React.useMemo(() => {
    const goups = [...groupMap.values()];
    return goups.filter((group) => group.client.group.admin.equals(wallet.publicKey));
  }, [groupMap, wallet]);

  React.useEffect(() => {
    if (!router.isReady || !initialized) return;

    const group = router.query.group as string;

    if (!group) {
      router.push("/404");
      return;
    }

    const groupData = ownPools.find((pool) => pool.groupPk.toBase58() === group);
    if (!groupData) {
      router.push("/404");
      return;
    }

    setActiveGroup(groupData);
  }, [router, ownPools, setActiveGroup, initialized]);

  return (
    <>
      <div className="w-full space-y-12 max-w-8xl mx-auto px-4 pb-16 pt-8 md:pt-14 min-h-[calc(100vh-100px)]">
        {activeGroup && <ManagePoolDetailHeader activeGroup={activeGroup} />}
        {activeGroup && <PoolDetailCard key={activeGroup.client.group.address.toBase58()} group={activeGroup} />}
      </div>
    </>
  );
}
