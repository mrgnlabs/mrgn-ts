import React from "react";
import { AccountSummary, AssetsList } from "~/components";
import { PageHeader } from "~/components/PageHeader";

const Home = () => (
  <>
    <PageHeader />
    <div className="w-full h-full flex flex-col justify-start content-start py-[64px] grid w-4/5 max-w-7xl gap-4 grid-cols-1 xl:grid-cols-2">
      <AccountSummary />
      <AssetsList />
    </div>
  </>
);

export default Home;
