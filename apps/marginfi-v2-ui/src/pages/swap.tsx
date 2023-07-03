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

  const [isInJupiterMode, setIsInJupiterMode] = useState(true);

  useEffect(() => {
    handleJupiterLoad();
  }, []);

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

  const handleMayanLoad = () => {
    console.log('trying to load mayan');
    const intervalId = setInterval(() => {
      if (window.MayanSwap) {
        console.log('MayanSwap loaded');
        const config = {
          appIdentity: {
            name: 'mayan on marginfi',
            icon: './logo.png',
            uri: 'https://app.marginfi.com',
          },
        };

        window.MayanSwap.init('swap_widget', config);
        clearInterval(intervalId); // Clear the interval once we have initialized MayanSwap
      }
    }, 100); // Check every 100ms
  }

  useEffect(() => {
    if (isInJupiterMode) {
      handleJupiterLoad();
    } else {
      handleMayanLoad();
    }
  }, [wallet, isInJupiterMode]);

  return (
    <>
      <PageHeaderSwap />
      <div className="w-full h-full flex flex-col justify-start items-center content-start py-[96px] sm:py-[32px] gap-8 w-4/5 max-w-7xl">
        <div>
          <div className="text-[#fff] text-3xl min-w-[600px] text-center">
            Zero fees. <span className="text-[#DCE85D]">Always.</span>
          </div>
        </div>
        <Script
          src="https://cdn.mayan.finance/widget_ultimate-0-4-1.js"
          onLoad={handleMayanLoad}
          integrity="sha256-HbxYmbIgLRzW/OCeUMFN7Caa/DxHfUJ+MthNOSaPM9s="
          crossOrigin="anonymous"
        />
        <BorrowLendToggle isInLendingMode={isInJupiterMode} setIsInLendingMode={setIsInJupiterMode} leftTitle="Jupiter" rightTitle="Mayan" paddingConfigs={{ left: "21px", right: "18px" }} />
        {
          isInJupiterMode && <div style={{ width: 420, maxWidth: "80%" }} id="integrated-terminal"></div>
        }
        {
          (!(isInJupiterMode)) && <div id="swap_widget"></div>
        }
      </div>
    </>
  );
};

export default SwapPage;
