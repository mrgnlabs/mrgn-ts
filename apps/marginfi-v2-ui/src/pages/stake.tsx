import { useEffect } from "react";
import { PageHeader } from "~/components/PageHeader";
import { StakingStats } from "~/components/Staking";
import { StakingCard } from "~/components/Staking/StakingCard/StakingCard";

const StakePage = () => {
  return (
    <>
      <PageHeader text={"$LST"} />
      <div className="flex flex-col h-full justify-center content-center pt-[64px] sm:pt-[16px] gap-4 mx-4">
        <StakingStats tvl={1250} projectedApy={0.5215} />
        <StakingCard />
      </div>
    </>
  );
};

export default StakePage;
