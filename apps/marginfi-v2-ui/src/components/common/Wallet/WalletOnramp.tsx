import React from "react";
import { loadMoonPay } from "@moonpay/moonpay-js";
import { MrgnTooltip } from "~/components/common/MrgnTooltip";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Button } from "~/components/ui/button";
import { IconCoins, IconX } from "~/components/ui/icons";

export const WalletOnramp = () => {
  const [moonPay, setMoonPay] = React.useState<any>(null);
  const [isMoonPayActive, setIsMoonPayActive] = React.useState(false);
  const { wallet } = useWalletContext();

  const initMoonpay = React.useCallback(async () => {
    try {
      const moonPayConstructor = await loadMoonPay();
      console.log("moonPayConstructor1");

      if (!moonPayConstructor) return;
      console.log("moonPayConstructor2");

      const moonPaySdk = moonPayConstructor({
        flow: "buy",
        environment: "production",
        variant: "embedded",
        containerNodeSelector: "#moonpay",
        params: {
          apiKey: process.env.NEXT_PUBLIC_MOONPAY_API_KEY!,
          // walletAddress: "0xb35Ea231b18dC4339f9Bb82F95915d65E5b30bE5",
          // walletAddress: wallet?.publicKey?.toString(),
          theme: "dark",
          // currencyCode: "sol",
          // defaultCurrencyCode: "eth",
          walletAddresses: JSON.stringify({
            SOL: wallet?.publicKey?.toString(),
            USDC_SOL: wallet?.publicKey?.toString(),
          }),
          baseCurrencyCode: "usd",
          baseCurrencyAmount: "100",
          colorCode: "#7d01ff",
        },
        debug: true,
      });

      if (!moonPaySdk) return;

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
    } catch (e) {
      console.log("initMoonpay error", e);
    }
  }, []);

  React.useEffect(() => {
    if (!window) return;
    initMoonpay();
  }, [window]);

  const triggerMoonpay = React.useCallback(() => {
    if (!moonPay) return;
    moonPay.show();
    setIsMoonPayActive(true);
  }, [moonPay]);

  // return (
  //   <MrgnTooltip title="Coming soon..." className="hidden md:block" placement="top">
  //     <Button variant="outline" className="w-full cursor-help opacity-50 hover:bg-background">
  //       <IconCoins size={14} />
  //       Buy crypto
  //     </Button>
  //   </MrgnTooltip>
  // );

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          triggerMoonpay();
        }}
        disabled={isMoonPayActive}
      >
        <IconCoins size={14} />
        {isMoonPayActive ? "Loading..." : "Buy crypto"}
      </Button>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "#1c1c1e",
          zIndex: 60,
          opacity: isMoonPayActive ? 1 : 0,
          pointerEvents: isMoonPayActive ? "auto" : "none",
        }}
      >
        <button
          onClick={() => {
            moonPay.close();
            setIsMoonPayActive(false);
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
    </>
  );
};
