"use client";

import React from "react";

import { useRouter } from "next/router";
import Script from "next/script";

import { PublicKey } from "@solana/web3.js";

import config from "~/config";
import { capture } from "~/utils";

import { useWalletContext } from "~/hooks/useWalletContext";

type SwapProps = {
  onLoad?: () => void;
};

export const Swap = ({ onLoad }: SwapProps) => {
  const { walletContextState } = useWalletContext();
  const [loadTimestamp, setLoadTimestamp] = React.useState(0);
  const router = useRouter();

  const initialMint = React.useMemo(() => {
    const inputMint = router.query.inputMint;
    let pk: PublicKey | undefined;
    try {
      pk = new PublicKey(inputMint as string);
    } catch (err) {
      pk = undefined;
    }

    return pk;
  }, [router.query]);

  if (loadTimestamp === 0) {
    setLoadTimestamp(Date.now());
  }

  return (
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
          formProps: {
            initialInputMint: initialMint ? initialMint.toBase58() : undefined,
          },
        });
        const currentTime = Date.now();
        const timeElapsed = currentTime - loadTimestamp;
        const delay = Math.max(0, 1000 - timeElapsed);
        setTimeout(() => {
          onLoad && onLoad();
        }, delay);
      }}
    />
  );
};
