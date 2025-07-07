import React from "react";

import { LendingPortfolio } from "~/components/common/Portfolio";

import { PortfolioHeader } from "~/components/common/Portfolio/components";

export default function PortfolioPage() {
  return (
    <>
      <div className="flex flex-col max-w-7xl mx-auto w-full h-full justify-start items-center px-4 mb-20">
        <PortfolioHeader />
        <LendingPortfolio />
      </div>
    </>
  );
}
