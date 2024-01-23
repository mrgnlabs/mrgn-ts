"use client";

import React from "react";

import Script from "next/script";

import config from "~/config";
import { cn, capture } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { PageHeader } from "~/components/common/PageHeader";
import { Loader } from "~/components/ui/loader";

export default function SwapPage() {
  const { walletContextState } = useWalletContext();
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [loadTimestamp, setLoadTimestamp] = React.useState(0);

  if (loadTimestamp === 0) {
    setLoadTimestamp(Date.now());
  }

  return (
    <>
      <Script
        src="https://terminal.jup.ag/main-v2.js"
        onReady={() => {
          window.Jupiter.init({
            displayMode: "integrated",
            integratedTargetId: "integrated-terminal",
            endpoint: config.rpcEndpoint,
            passThroughWallet: walletContextState.wallet,
            onSuccess: ({ txid }: { txid: string }) => {
              capture("user_swap", {
                txn: txid,
              });
            },
          });
          const currentTime = Date.now();
          const timeElapsed = currentTime - loadTimestamp;
          const delay = Math.max(0, 1000 - timeElapsed);
          setTimeout(() => {
            setIsLoaded(true);
          }, delay);
        }}
      />
      <PageHeader>
        <div className="h-full flex flex-row gap-1 items-center">
          <span>swap</span>
          <div className="hidden sm:block flex-row items-center gap-1">
            <span className="text-sm h-[48px] pt-[28px] bg-white bg-clip-text text-transparent">Powered</span>
            <span className="text-sm h-[48px] pt-[28px] bg-white bg-clip-text text-transparent">by</span>
            <span className="text-sm h-[48px] pt-[28px] bg-jup-gradient-colors bg-clip-text text-transparent ml-1">
              Jupiter
            </span>
          </div>
        </div>
      </PageHeader>
      <div className="h-full flex flex-col justify-start items-center content-start py-[32px] gap-8 w-4/5">
        {!isLoaded && <Loader label="Loading Jupiter swap..." className="mt-8" />}
        <div
          className={cn("max-w-[420px] px-3 transition-opacity", !isLoaded && "opacity-0")}
          id="integrated-terminal"
        ></div>
      </div>
    </>
  );
}
