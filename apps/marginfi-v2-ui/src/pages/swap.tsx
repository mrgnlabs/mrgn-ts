"use client";

import React from "react";

import Script from "next/script";

import config from "~/config";
import { useWalletContext } from "~/hooks/useWalletContext";

import { PageHeader } from "~/components/common/PageHeader";

const SwapPage = () => {
  const { walletContextState } = useWalletContext();

  return (
    <>
      <Script
        src="https://terminal.jup.ag/main-v1.js"
        onReady={() => {
          window.Jupiter.init({
            displayMode: "integrated",
            integratedTargetId: "integrated-terminal",
            endpoint: config.rpcEndpoint,
            passThroughWallet: walletContextState.wallet,
          });
        }}
      />
      <PageHeader>
        <div className="h-full flex flex-row gap-1 items-center">
          <span>swap</span>
          <div className="hidden sm:block flex flex-row items-center gap-1">
            <span className="text-sm h-[48px] pt-[28px] bg-white bg-clip-text text-transparent">Powered</span>
            <span className="text-sm h-[48px] pt-[28px] bg-white bg-clip-text text-transparent">by</span>
            <span className="text-sm h-[48px] pt-[28px] bg-jup-gradient-colors bg-clip-text text-transparent ml-1">
              Jupiter
            </span>
          </div>
        </div>
      </PageHeader>
      <div className="w-full h-full flex flex-col justify-start items-center content-start py-[32px] gap-8 w-4/5">
        <div className="max-w-[420px] px-3" id="integrated-terminal"></div>
      </div>
    </>
  );
};

export default SwapPage;
