"use client";

import { useEffect } from "react";
import config from "~/config";
import { PageHeader } from "~/components/desktop/PageHeader";
import { useWalletContext } from "~/hooks/useWalletContext";

const SwapPage = () => {
  const { walletContextState } = useWalletContext();

  useEffect(() => {
      window.Jupiter.init({
        displayMode: "integrated",
        integratedTargetId: "integrated-terminal",
        endpoint: config.rpcEndpoint,
        passThroughWallet: walletContextState.wallet,
      });
  }, [walletContextState.wallet]);

  return (
    <>
      <PageHeader>
        <div className="h-full flex flex-row gap-1 items-center">
          <span>swap</span>
          <div className="hidden sm:block flex flex-row items-center gap-1">
            <span className="text-sm h-[48px] pt-[28px] bg-white bg-clip-text text-transparent">Powered</span>
            <span className="text-sm h-[48px] pt-[28px] bg-white bg-clip-text text-transparent">by</span>
            <span className="text-sm h-[48px] pt-[28px] bg-jup-gradient-colors bg-clip-text text-transparent">
              Jupiter
            </span>
          </div>
        </div>
      </PageHeader>
      <div className="w-full h-full flex flex-col justify-start items-center content-start py-[32px] gap-8 w-4/5">
        <div>
          <div className="text-[#fff] text-3xl min-w-[600px] text-center">
            Zero fees. <span className="text-[#DCE85D]">Always.</span>
          </div>
        </div>
        <div className="max-w-[420px] px-3" id="integrated-terminal"></div>
      </div>
    </>
  );
};

export default SwapPage;
