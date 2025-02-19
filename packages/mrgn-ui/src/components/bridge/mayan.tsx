import React from "react";
import Script from "next/script";

import {  capture, generateEndpoint } from "@mrgnlabs/mrgn-utils";
import { toastManager } from "@mrgnlabs/mrgn-toasts";

import { useWalletStore } from "~/components/wallet-v2/store/wallet.store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import type { MayanWidgetColors, MayanWidgetConfigType } from "./mayan.types";

type MayanProps = {
  onLoad?: () => void;
};

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
  "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7", // DRIFT
  "85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ", // W
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
  "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", // JITO
];

const appIdentity = {
  name: "Mayan",
  icon: "./marginfi_logo.png",
  uri: "https://app.marginfi.com/",
};

const colors: MayanWidgetColors = {
  mainBox: "transaparent",
  background: "transparent",
  primary: "#101212",
};

const rpcs = {
  solana: generateEndpoint(
    process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE as string,
    process.env.NEXT_PUBLIC_RPC_PROXY_KEY as string
  ),
};
const solanaReferrerAddress = "GhQ3NxahWcddaMa71rkDp1FdTfs2jBpjzCq3kzkv1mNZ";
const evmReferrerAddress = "0x0bb342B595Dc30638524cab81138cDa9CAa2636D";

const mayanWidgetConfig: MayanWidgetConfigType = {
  appIdentity,
  colors,
  rpcs,
  solanaReferrerAddress,
  evmReferrerAddress,
  tokens: {
    to: {
      solana: tokens,
    },
  },
};

export const Mayan = ({ onLoad }: MayanProps) => {
  const { walletAddress, walletContextState } = useWallet();
  const [setIsWalletSignUpOpen] = useWalletStore((state) => [state.setIsWalletSignUpOpen]);
  const [loadTimestamp, setLoadTimestamp] = React.useState(0);

  if (loadTimestamp === 0) {
    setLoadTimestamp(Date.now());
  }

  const handleConnect = React.useCallback(async () => {
    try {
      if (!walletContextState.wallet) {
        setIsWalletSignUpOpen(true);
      } else {
        await walletContextState.connect();
      }
    } catch (err) {
      console.error(err);
    }
  }, [walletContextState, setIsWalletSignUpOpen]);

  const handleLoadMayanWidget = React.useCallback(() => {
    const multiStepToast = toastManager.createMultiStepToast("Bridge", [{ label: `Cross-chain swap/bridge in progress` }]);
    const config: MayanWidgetConfigType = {
      ...mayanWidgetConfig,
      // With current useWalletContext it's impossible to make pass through work
      enableSolanaPassThrough: false,
    };
    window.MayanSwap.init("swap_widget", config);
    window.MayanSwap.setSwapInitiateListener((data) => {
      multiStepToast.start();
    });
    window.MayanSwap.setSwapCompleteListener((data) => {
      multiStepToast.successAndNext();
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
      if (onLoad) {
        onLoad();
      }
    }, delay);
  }, [loadTimestamp, onLoad]);

  return (
    <div>
      <Script
        src="https://cdn.mayan.finance/mayan_widget_v_1_1_0_nowc.js"
        integrity="sha256-/hZkPxchnwtjN6dCbg9acL9cDLd1SHLVn0KZ5p1kneQ="
        crossOrigin="anonymous"
        onReady={handleLoadMayanWidget}
      />
    </div>
  );
};
