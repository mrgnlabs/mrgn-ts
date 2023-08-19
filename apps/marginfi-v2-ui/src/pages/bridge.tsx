"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import config from "~/config";
import Script from "next/script";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { toast } from "react-toastify";
import { useRecoilState } from "recoil";
import { showBadgesState } from "~/state";
import { useHotkeys } from "react-hotkeys-hook";
import { PageHeaderBridge } from "~/components/PageHeader";
import { MayanWidgetColors, MayanWidgetConfigType } from "~/types";

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
  const { publicKey, signTransaction, connect, disconnect, wallet } = useWallet();
  const { setVisible, visible } = useWalletModal();
  const [isBridgeIn, setIsBridgeIn] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [showBadges, setShowBadges] = useRecoilState(showBadgesState);
  const [isHotkeyMode, setIsHotkeyMode] = useState(false);

  // Enter hotkey mode
  useHotkeys(
    "meta + k",
    () => {
      setIsHotkeyMode(true);
      setShowBadges(true);

      setTimeout(() => {
        setIsHotkeyMode(false);
        setShowBadges(false);
      }, 5000);
    },
    { preventDefault: true, enableOnFormTags: true }
  );

  const handleConnect = async () => {
    try {
      if (!wallet) {
        setVisible(!visible);
      } else {
        await connect();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.MayanSwap !== "undefined") {
      window.MayanSwap.updateSolanaWallet({
        signTransaction,
        publicKey: publicKey ? publicKey.toString() : null,
        onClickOnConnect: handleConnect,
        onClickOnDisconnect: disconnect,
      });
    }
  }, [publicKey, signTransaction, disconnect, setVisible, visible, wallet, connect]);

  const handleLoadMayanWidget = () => {
    const configIndex = isBridgeIn ? 0 : 1;
    const config = {
      ...configs[configIndex],
      solanaWallet: {
        publicKey: publicKey ? publicKey.toString() : null,
        signTransaction,
        onClickOnConnect: handleConnect,
        onClickOnDisconnect: disconnect,
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
    setIsLoaded(true);
  };

  const handleUpdateConfig = () => {
    const newConfigIndex = isBridgeIn ? 1 : 0;
    const config = {
      ...configs[newConfigIndex],
      solanaWallet: {
        publicKey: publicKey ? publicKey.toString() : null,
        signTransaction,
        onClickOnConnect: handleConnect,
        onClickOnDisconnect: disconnect,
      },
    };
    if (window.MayanSwap) {
      window.MayanSwap.updateConfig(config);
    } else {
      return;
    }
    setIsBridgeIn((prevState) => !prevState);
  };

  useEffect(() => {
    handleUpdateConfig;
  }, []);

  return (
    <>
      <PageHeaderBridge />
      <div className="w-full h-full flex flex-col justify-start items-center content-start py-[96px] sm:py-[32px] gap-8 w-4/5 max-w-7xl">
        <div className="text-[#fff] text-3xl min-w-[600px] text-center">
          Zero fees. <span className="text-[#DCE85D]">Always.</span>
        </div>
        <Script
          src="https://cdn.mayan.finance/widget_solana-0-4-5.js"
          integrity="sha256-mTVQLKvE422WDwtZQUcz/9u5ZK3T1vMfSO0omQvla0E="
          crossOrigin="anonymous"
          onReady={handleLoadMayanWidget}
        />
        <div className="max-h-[500px]" id="swap_widget"></div>
      </div>
    </>
  );
};

export default BridgePage;
