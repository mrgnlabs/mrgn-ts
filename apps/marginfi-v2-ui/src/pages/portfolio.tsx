import React from "react";

import { useMrgnlendStore, useUiStore } from "~/store";

import { LendingPortfolio } from "~/components/common/Portfolio";
import { ActionComplete } from "~/components/common/ActionComplete";
import { PortfolioHeader } from "~/components/common/Portfolio/PortfolioHeader";

export default function PortfolioPage() {
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  return (
    <>
      <div className="flex flex-col max-w-7xl mx-auto w-full h-full justify-start items-center px-4 gap-4 mb-20">
        <PortfolioHeader />
        <LendingPortfolio />
      </div>
      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}
