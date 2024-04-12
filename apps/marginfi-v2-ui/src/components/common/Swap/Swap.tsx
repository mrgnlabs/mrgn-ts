"use client";

import React from "react";

import { useRouter } from "next/router";
import Script from "next/script";

import { PublicKey } from "@solana/web3.js";

import config from "~/config";
import { capture } from "~/utils";

import { WSOL_MINT, LST_MINT } from "@mrgnlabs/mrgn-common";

import { useWalletContext } from "~/hooks/useWalletContext";

type SwapProps = {
  onLoad?: () => void;
  initialInputMint?: PublicKey;
};

export const Swap = ({ onLoad, initialInputMint }: SwapProps) => {
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

  const handleOnReady = React.useCallback(() => {
    if (!window.Jupiter) return;

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
        initialInputMint: initialInputMint
          ? initialInputMint.toBase58()
          : initialMint
          ? initialMint.toBase58()
          : undefined,
        initialOutputMint: initialInputMint?.equals(WSOL_MINT) ? LST_MINT.toBase58() : WSOL_MINT.toBase58(),
      },
    });
    const currentTime = Date.now();
    const timeElapsed = currentTime - loadTimestamp;
    const delay = Math.max(0, 1000 - timeElapsed);
    setTimeout(() => {
      onLoad && onLoad();
    }, delay);
  }, [initialInputMint, loadTimestamp, onLoad, walletContextState.wallet, initialMint]);

  React.useEffect(() => {
    if (!initialInputMint) {
      return;
    }

    handleOnReady();
  }, [initialInputMint, handleOnReady]);

  if (loadTimestamp === 0) {
    setLoadTimestamp(Date.now());
  }

  return (
    <Script
      src="https://terminal.jup.ag/main-v2.js"
      onReady={() => {
        handleOnReady();
      }}
    />
  );
};
