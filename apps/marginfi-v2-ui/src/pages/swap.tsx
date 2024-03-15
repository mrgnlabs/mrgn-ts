"use client";

import React from "react";
import { useRouter } from "next/router";
import Script from "next/script";

import { PublicKey } from "@solana/web3.js";

import config from "~/config";
import { cn, capture } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { Loader } from "~/components/ui/loader";

export default function SwapPage() {
  const { walletContextState } = useWalletContext();
  const [isLoaded, setIsLoaded] = React.useState(false);
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
            formProps: {
              initialInputMint: initialMint ? initialMint.toBase58() : undefined,
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
      <div className="h-full flex flex-col justify-start items-center content-start gap-8 w-4/5">
        {!isLoaded && <Loader label="Loading Jupiter swap..." className="mt-8" />}
        <div
          className={cn("max-w-[420px] px-3 transition-opacity", !isLoaded && "opacity-0")}
          id="integrated-terminal"
        ></div>
      </div>
    </>
  );
}
