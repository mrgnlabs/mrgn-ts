import React from "react";

import Script from "next/script";

import { useHotkeys } from "react-hotkeys-hook";

import config from "~/config";
import { cn, capture } from "~/utils";
import { MayanWidgetColors, MayanWidgetConfigType } from "~/types";
import { useUserProfileStore, useUiStore } from "~/store";
import { MultiStepToastHandle } from "~/utils/toastUtils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { Loader } from "~/components/ui/loader";

const tokens = [
  "0x0000000000000000000000000000000000000000", // SOL
  "7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT", // UXD
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // mSOL
  "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", // jitoSOL
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", // stSOL
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1", // bSOL
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", // ETH
  "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh", // BTC
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
  "DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ", // DUST
  "kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6", // KIN
  "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux", // HNT
  "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", // PYTH
  "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y", // SHDW
];

const appIdentity = {
  name: "Mayan",
  icon: "./marginfi_logo.png",
  uri: "https://app.marginfi.com/",
};

const colors: MayanWidgetColors = {
  mainBox: "transaparent",
  background: "transparent",
};

const rpcs = {
  solana: config.rpcEndpoint,
  ethereum: process.env.NEXT_PUBLIC_ETHEREUM_RPC_ENDPOINT,
  bsc: process.env.NEXT_PUBLIC_BSC_ENDPOINT,
  polygon: process.env.NEXT_PUBLIC_POLYGON_ENDPOINT,
  avalanche: process.env.NEXT_PUBLIC_AVALANCE_ENDPOINT,
  arbitrum: process.env.NEXT_PUBLIC_ARBITRUM_ENDPOINT,
  optimism: process.env.NEXT_PUBLIC_OPTIMISM_ENDPOINT,
  base: process.env.NEXT_PUBLIC_BASE_ENDPOINT,
};
const referrerAddress = "GhQ3NxahWcddaMa71rkDp1FdTfs2jBpjzCq3kzkv1mNZ";

const configs: MayanWidgetConfigType[] = [
  {
    appIdentity,
    colors,
    rpcs,
    referrerAddress,
    tokens: {
      to: {
        solana: tokens,
      },
    },
    sourceChains: ["solana", "polygon", "ethereum", "arbitrum", "bsc", "avalanche", "optimism"],
    destinationChains: ["solana", "polygon", "ethereum", "arbitrum", "bsc", "avalanche", "optimism"],
    solanaExtraRpcs: [process.env.NEXT_PUBLIC_SOLANA2_RPC_ENDPOINT],
  },
];

export default function BridgePage() {
  const { walletAddress, walletContextState } = useWalletContext();
  const setShowBadges = useUserProfileStore((state) => state.setShowBadges);
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);
  const [isBridgeIn, setIsBridgeIn] = React.useState<boolean>(true);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [loadTimestamp, setLoadTimestamp] = React.useState(0);

  if (loadTimestamp === 0) {
    setLoadTimestamp(Date.now());
  }

  // Enter hotkey mode
  useHotkeys(
    "meta + k",
    () => {
      setShowBadges(true);

      setTimeout(() => {
        setShowBadges(false);
      }, 5000);
    },
    { preventDefault: true, enableOnFormTags: true }
  );

  const handleConnect = React.useCallback(async () => {
    try {
      if (!walletContextState.wallet) {
        setIsWalletAuthDialogOpen(true);
      } else {
        await walletContextState.connect();
      }
    } catch (err) {
      console.error(err);
    }
  }, [walletContextState, setIsWalletAuthDialogOpen]);

  const handleLoadMayanWidget = React.useCallback(() => {
    const multiStepToast = new MultiStepToastHandle("Bridge", [{ label: `Cross-chain swap/bridge in progress` }]);
    const configIndex = isBridgeIn ? 0 : 1;
    const config: MayanWidgetConfigType = {
      ...configs[configIndex],
      // With current useWalletContext it's impossible to make pass through work
      enableSolanaPassThrough: false,
    };
    window.MayanSwap.init("swap_widget", config);
    window.MayanSwap.setSwapInitiateListener((data) => {
      multiStepToast.start();
    });
    window.MayanSwap.setSwapCompleteListener((data) => {
      multiStepToast.setSuccessAndNext();
      capture("user_swap", {
        txn: data.hash,
        fromChain: data.fromChain,
        toChain: data.toChain,
        fromToken: data.fromToken,
        toToken: data.toToken,
        fromAmount: data.fromAmount,
      });
    });
    window.MayanSwap.setSwapRefundListener((data) => {
      multiStepToast.setFailed("Cross-chain swap/bridge refunded");
    });

    const currentTime = Date.now();
    const timeElapsed = currentTime - loadTimestamp;
    const delay = Math.max(0, 1000 - timeElapsed);
    setTimeout(() => {
      setIsLoaded(true);
    }, delay);
  }, [isBridgeIn, loadTimestamp]);

  const handleUpdateConfig = React.useCallback(() => {
    const newConfigIndex = isBridgeIn ? 1 : 0;
    const config = {
      ...configs[newConfigIndex],
      solanaWallet: {
        publicKey: walletAddress ? walletAddress.toString() : null,
        signTransaction: walletContextState.signTransaction,
        onClickOnConnect: handleConnect,
        onClickOnDisconnect: walletContextState.disconnect,
      },
    };
    if (window.MayanSwap) {
      window.MayanSwap.updateConfig(config);
    } else {
      return;
    }
    setIsBridgeIn((prevState) => !prevState);
  }, [handleConnect, isBridgeIn, walletAddress, walletContextState]);

  React.useEffect(() => {
    handleUpdateConfig;
  }, [handleUpdateConfig]);

  return (
    <>
      <div className="w-full h-full flex flex-col justify-start items-center content-start gap-8">
        <Script
          src="https://cdn.mayan.finance/mayan_widget_v_1_0_6.js"
          integrity="sha256-buhc9wKIHrtd5pQJtJdeNCqZq8KPAsqz5VPdg8G58ig="
          crossOrigin="anonymous"
          onReady={handleLoadMayanWidget}
        />
        {!isLoaded && <Loader label="Loading Mayan bridge..." className="mt-8" />}
        <div
          className={cn("max-w-[420px] max-h-[500px] transition-opacity", !isLoaded && "opacity-0")}
          id="swap_widget"
        />
      </div>
    </>
  );
}
