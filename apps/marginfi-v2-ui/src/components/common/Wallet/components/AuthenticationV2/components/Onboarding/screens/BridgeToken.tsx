import React from "react";

import { OnrampScreenProps } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const BridgeToken: React.FC<props> = ({ onNext }: props) => {
  const divRef = React.useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const [widget, setWidget] = React.useState<any>();
  const isMobile = useIsMobile();

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
  }, [widget, window.deBridge]);

  React.useEffect(() => {
    if (window.deBridge && isMounted && !(divRef.current && divRef.current.innerHTML)) {
      loadDeBridgeWidget();
    }
  }, [isMounted]);

  const loadDeBridgeWidget = () => {
    const widget = window.deBridge.widget({
      v: "1",
      element: "debridgeWidget",
      title: "",
      description: "",
      width: isMobile ? "430" : "460",
      height: "500",
      r: 16890,
      supportedChains:
        '{"inputChains":{"1":"all","10":"all","56":"all","137":"all","8453":"all","42161":"all","43114":"all","59144":"all","7565164":"all","245022934":"all"},"outputChains":{"7565164":"all"}}',
      inputChain: 56,
      outputChain: 7565164,
      inputCurrency: "",
      outputCurrency: "",
      address: "",
      showSwapTransfer: false,
      amount: "",
      outputAmount: "",
      isAmountFromNotModifiable: false,
      isAmountToNotModifiable: false,
      lang: "en",
      mode: "deswap",
      isEnableCalldata: false,
      styles:
        "eyJhcHBCYWNrZ3JvdW5kIjoiIzExMTQxNiIsImFwcEFjY2VudEJnIjoiIzExMTQxNiIsImNoYXJ0QmciOiIjMWMyMTI1IiwiYmFkZ2UiOiIjMWQyMTI1IiwiYm9yZGVyUmFkaXVzIjo4LCJ0b29sdGlwQmciOiIjMDAwMDAwIiwiZm9ybUNvbnRyb2xCZyI6IiMxODFkMjAiLCJkcm9wZG93bkJnIjoiIzE4MWQyMCIsInByaW1hcnkiOiIjZmZmZmZmIiwic2Vjb25kYXJ5IjoiIzIyMjYyYSIsImljb25Db2xvciI6IiNmZmZmZmYiLCJmb250Q29sb3JBY2NlbnQiOiIjMzY0MTQ4IiwiZm9udEZhbWlseSI6IiIsInByaW1hcnlCdG5CZyI6IiNmZmZmZmYiLCJzZWNvbmRhcnlCdG5CZyI6IiMyMjI2MmEiLCJsaWdodEJ0bkJnIjoiIn0=",
      theme: "dark",
      isHideLogo: false,
      logo: "",
    });

    setWidget(widget);
  };

  return (
    <ScreenWrapper>
      <div className="flex justify-center overflow-y-scroll">
        <div id="debridgeWidget"></div>
      </div>
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};
