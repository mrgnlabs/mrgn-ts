import React from "react";

import { loadMoonPay } from "@moonpay/moonpay-js";

import { useUiStore } from "~/store";

import { useWalletContext } from "~/hooks/useWalletContext";

import { Button } from "~/components/ui/button";
import { IconX } from "~/components/ui/icons";

export const WalletOnramp = () => {
  const [moonPay, setMoonPay] = React.useState<any>(null);
  const { wallet } = useWalletContext();
  const [isOnrampActive, setIsOnrampActive] = useUiStore((state) => [
    state.isWalletOnrampActive,
    state.setIsOnrampActive,
  ]);

  // initialize moonPay sdk on mount
  const initMoonpay = React.useCallback(async () => {
    try {
      const moonPayConstructor = await loadMoonPay();

      if (!moonPayConstructor) return;

      const moonPaySdk = moonPayConstructor({
        flow: "buy",
        environment: "production",
        variant: "embedded",
        containerNodeSelector: "#moonpay",
        params: {
          apiKey: process.env.NEXT_PUBLIC_MOONPAY_API_KEY!,
          theme: "dark",
          walletAddresses: JSON.stringify({
            sol: wallet?.publicKey?.toString(),
            usdc_sol: wallet?.publicKey?.toString(),
          }),
          baseCurrencyCode: "usd",
          baseCurrencyAmount: "30",
          colorCode: "#7d01ff",
        },
        debug: true,
      });

      if (!moonPaySdk) return;

      // moonPay requires a signature to be generated on the server
      const urlForSignature = moonPaySdk.generateUrlForSigning();
      const response = await fetch("/api/moonpay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urlForSignature }),
      });
      const data = await response.json();

      moonPaySdk.updateSignature(data.signature);
      setMoonPay(moonPaySdk);

      // show if onramp already set to active (e.g from wallet funding popup)
      if (isOnrampActive) {
        moonPaySdk.show();
      }
    } catch (e) {
      console.log("initMoonpay error", e);
    }
  }, [isOnrampActive, wallet?.publicKey]);

  React.useEffect(() => {
    if (!window) return;
    initMoonpay();
  }, [initMoonpay]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "#1c1c1e",
        zIndex: 60,
        opacity: isOnrampActive ? 1 : 0,
        pointerEvents: isOnrampActive ? "auto" : "none",
      }}
    >
      <button
        onClick={() => {
          moonPay.close();
          setIsOnrampActive(false);
        }}
        className="h-12 items-center px-1.5 flex gap-1 w-full font-medium text-[#98989E] text-sm justify-center text-center"
      >
        <IconX size={18} /> back to wallet
      </button>
      <div
        id="moonpay"
        style={{
          width: "100%",
          height: "calc(100% - 48px)",
        }}
      />
    </div>
  );
};
