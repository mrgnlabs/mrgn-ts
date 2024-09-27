import React from "react";

import { useIsMobile, cn } from "@mrgnlabs/mrgn-utils";

import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

const Debridge = () => {
  const { wallet } = useWallet();
  const divRef = React.useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const [widget, setWidget] = React.useState<any>();
  const isMobile = useIsMobile();

  const loadDeBridgeWidget = React.useCallback(() => {
    const widget = window.deBridge.widget({
      v: "1",
      element: "debridgeWidget",
      title: "",
      description: "",
      width: "328",
      height: "",
      r: 16890,
      supportedChains:
        '{"inputChains":{"1":"all","10":"all","56":"all","137":"all","8453":"all","42161":"all","43114":"all","59144":"all","7565164":"all","245022934":"all"},"outputChains":{"7565164":"all"}}',
      inputChain: 1,
      outputChain: 7565164,
      inputCurrency: "ETH",
      outputCurrency: "SOL",
      address: wallet.publicKey.toBase58(),
      showSwapTransfer: true,
      amount: "",
      outputAmount: "",
      isAmountFromNotModifiable: false,
      isAmountToNotModifiable: false,
      lang: "en",
      mode: "deswap",
      isEnableCalldata: false,
      styles:
        "eyJhcHBCYWNrZ3JvdW5kIjoicmdiYSgxOCwyMCwyMiwwKSIsImFwcEFjY2VudEJnIjoicmdiYSgyNTUsMjU1LDI1NSwwKSIsImNoYXJ0QmciOiJyZ2JhKDE4LDIwLDIyLDApIiwiYmFkZ2UiOiIjZGNlODVkIiwiYm9yZGVyUmFkaXVzIjo4LCJmb250RmFtaWx5IjoiIiwicHJpbWFyeUJ0bkJnIjoiI2ZmZmZmZiIsInNlY29uZGFyeUJ0bkJnIjoiI0RDRTg1RCIsImxpZ2h0QnRuQmciOiIiLCJpc05vUGFkZGluZ0Zvcm0iOnRydWUsImJ0blBhZGRpbmciOnsidG9wIjoxMiwicmlnaHQiOm51bGwsImJvdHRvbSI6MTIsImxlZnQiOm51bGx9LCJidG5Gb250U2l6ZSI6bnVsbCwiYnRuRm9udFdlaWdodCI6NDAwfQ==",
      theme: "dark",
      isHideLogo: false,
      logo: "",
    });

    setWidget(widget);
  }, [isMobile, wallet.publicKey]);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (widget) {
      widget.then((widget: any) => {
        widget.on("order", (event: any, params: any) => {
          console.log("order params", params);
        });

        widget.on("singleChainSwap", (event: any, params: any) => {
          console.log("singleChainSwap params", params);
        });
      });
    }
  }, [widget]);

  React.useEffect(() => {
    if (window.deBridge && isMounted && !(divRef.current && divRef.current.innerHTML)) {
      loadDeBridgeWidget();
    }
  }, [isMounted, loadDeBridgeWidget]);

  return (
    <div
      id="debridgeWidget"
      className={cn("max-w-[420px] mx-auto w-full px-[1.35rem] max-h-[500px] transition-opacity font-aeonik")}
    ></div>
  );
};

export { Debridge };
