'use client'

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import config from "~/config";
import { PageHeaderSwap } from "~/components/PageHeader";
import Script from 'next/script';
import { BorrowLendToggle } from '~/components/AssetsList/BorrowLendToggle';

const SwapPage = () => {
  const wallet = useWallet();
  const { wallet: jupWallet } = useWallet();

  const handleJupiterLoad = () => {
    if (wallet) {
      // @ts-ignore
      window.Jupiter.init({
        displayMode: "integrated",
        integratedTargetId: "integrated-terminal",
        endpoint: config.rpcEndpoint,
        passThroughWallet: jupWallet,
      });
    }
  };



  useEffect(() => {
    handleJupiterLoad();
  }, [wallet]);

  return (
    <>
      <PageHeaderSwap />
      <div className="w-full h-full flex flex-col justify-start items-center content-start py-[96px] sm:py-[32px] gap-8 w-4/5 max-w-7xl">
        <div>
          <div className="text-[#fff] text-3xl min-w-[600px] text-center">
            Zero fees. <span className="text-[#DCE85D]">Always.</span>
          </div>
        </div>
        <div style={{ width: 420, maxWidth: "80%" }} id="integrated-terminal"></div>
      </div>
    </>
  );
};

export default SwapPage;
