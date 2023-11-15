import React from "react";

import Script from "next/script";

import { toast } from "react-toastify";
import { useHotkeys } from "react-hotkeys-hook";

import config from "~/config";
import { MayanWidgetColors, MayanWidgetConfigType } from "~/types";
import { useUserProfileStore, useUiStore } from "~/store";
import { Desktop } from "~/mediaQueries";
import { useWalletContext } from "~/hooks/useWalletContext";
import { PageHeader } from "~/components/common/PageHeader";

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
];

const appIdentity = {
  name: "Mayan",
  icon: "./marginfi_logo.png",
  uri: "https://app.marginfi.com/",
};

const colors: MayanWidgetColors = {
  mainBox: "#0F1111",
  background: "#0F1111",
};

const rpcs = {
  solana: config.rpcEndpoint,
  ethereum: process.env.NEXT_PUBLIC_ETHEREUM_RPC_ENDPOINT,
  bsc: process.env.NEXT_PUBLIC_BSC_ENDPOINT,
  polygon: process.env.NEXT_PUBLIC_POLYGON_ENDPOINT,
  avalanche: process.env.NEXT_PUBLIC_AVALANCE_ENDPOINT,
  arbitrum: process.env.NEXT_PUBLIC_ARBITRUM_ENDPOINT,
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
    sourceChains: ["solana", "polygon", "ethereum", "arbitrum", "bsc", "avalanche", "aptos"],
    destinationChains: ["solana", "polygon", "ethereum", "arbitrum", "bsc", "avalanche", "aptos"],
  },
];
const BridgePage = () => {
  const { walletAddress, walletContextState } = useWalletContext();
  const setShowBadges = useUserProfileStore((state) => state.setShowBadges);
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);

  const [isBridgeIn, setIsBridgeIn] = React.useState<boolean>(true);

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
    console.log("handleConnect", walletContextState);
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

  React.useEffect(() => {
    if (typeof window !== "undefined" && typeof window.MayanSwap !== "undefined") {
      window.MayanSwap.updateSolanaWallet({
        signTransaction: walletContextState.signTransaction,
        publicKey: walletAddress ? walletAddress.toString() : null,
        onClickOnConnect: handleConnect,
        onClickOnDisconnect: walletContextState.disconnect,
      });
    }
  }, [walletContextState, handleConnect, walletAddress]);

  const handleLoadMayanWidget = React.useCallback(() => {
    const configIndex = isBridgeIn ? 0 : 1;
    const config = {
      ...configs[configIndex],
      solanaWallet: {
        publicKey: walletAddress ? walletAddress.toString() : null,
        signTransaction: walletContextState.signTransaction,
        onClickOnConnect: handleConnect,
        onClickOnDisconnect: walletContextState.disconnect,
      },
    };
    window.MayanSwap.init("swap_widget", config);
    window.MayanSwap.setSwapInitiateListener((data) => {
      toast.loading("Cross-chain swap/bridge in progress", {
        toastId: data.hash,
      });
    });
    window.MayanSwap.setSwapCompleteListener((data) => {
      toast.update(data.hash, {
        render: "Cross-chain swap/bridge done",
        toastId: data.hash,
        type: toast.TYPE.SUCCESS,
        autoClose: 5000,
        isLoading: false,
      });
    });
    window.MayanSwap.setSwapRefundListener((data) => {
      toast.update(data.hash, {
        render: "Cross-chain swap/bridge refunded",
        toastId: data.hash,
        type: toast.TYPE.WARNING,
        autoClose: 5000,
        isLoading: false,
      });
    });
  }, [handleConnect, isBridgeIn, walletAddress, walletContextState.disconnect, walletContextState.signTransaction]);

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
      <PageHeader>
        <div className="flex flex-row gap-1">
          <span>bridge</span>
          <Desktop>
            <div className="hidden sm:block flex-row items-center gap-1">
              <span className="text-sm h-[48px] pt-[28px] bg-white bg-clip-text text-transparent">Powered</span>
              <span className="text-sm h-[48px] pt-[28px] bg-white bg-clip-text text-transparent">by</span>
              <span className="text-sm h-[48px] pt-[28px] bg-mayan-gradient-colors bg-clip-text text-transparent ml-1">
                Mayan
              </span>
            </div>
          </Desktop>
        </div>
      </PageHeader>
      <div className="w-full h-full flex flex-col justify-start items-center content-start py-[32px] gap-8">
        <Script
          src="https://cdn.mayan.finance/widget_solana-0-4-5.js"
          integrity="sha256-mTVQLKvE422WDwtZQUcz/9u5ZK3T1vMfSO0omQvla0E="
          crossOrigin="anonymous"
          onReady={handleLoadMayanWidget}
        />
        <div className="max-w-[420px] max-h-[500px]" id="swap_widget" />
      </div>
    </>
  );
};

export default BridgePage;
