import { useEffect } from "react";
import config from "~/config";
import { PageHeaderSwap } from "~/components/desktop/PageHeader";
import { useWalletContext } from "~/hooks/useWalletContext";
import { MobilePortfolioOverview } from "~/components/mobile/MobilePortfolioOverview/MobilePortfolioOverview";

const PortfolioPage = () => {
  return (
    <>
      <PageHeaderSwap />
      <div className="w-full h-full flex flex-col justify-start items-center content-start py-[96px] sm:py-[32px] gap-8 w-4/5 max-w-7xl">
        <MobilePortfolioOverview />
      </div>
    </>
  );
};

export default PortfolioPage;
