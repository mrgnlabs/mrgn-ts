import React from "react";
import Script from "next/script";

import { OnrampScreenProps } from "~/utils";
import { Bridge } from "~/components/common/Bridge";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const BridgeToken: React.FC<props> = ({ onNext }: props) => {
  const divRef = React.useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const [widget, setWidget] = React.useState<any>();

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
      width: "400",
      height: "450",
      r: 16890,
      supportedChains:
        '{"inputChains":{"1":"all","10":"all","56":"all","137":"all","8453":"all","42161":"all","43114":"all","59144":"all","7565164":"all","245022934":"all"},"outputChains":{"1":"all","10":"all","56":"all","137":"all","8453":"all","42161":"all","43114":"all","59144":"all","7565164":"all","245022934":"all"}}',
      inputChain: 1,
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
        "eyJhcHBCYWNrZ3JvdW5kIjoicmdiYSgyNTUsMjU1LDI1NSwwKSIsImFwcEFjY2VudEJnIjoicmdiYSgyNTUsMjU1LDI1NSwwKSIsImJhZGdlIjoicmdiYSgyNTUsMjU1LDI1NSwwKSIsImJvcmRlclJhZGl1cyI6OCwicHJpbWFyeSI6IiNmZmZmZmYiLCJzdWNjZXNzIjoiIzc1YmE4MCIsImVycm9yIjoiI2UwN2Q2ZiIsIndhcm5pbmciOiIjZGFhMjA0IiwiaWNvbkNvbG9yIjoiI2ZmZmZmZiIsImZvbnRGYW1pbHkiOiIiLCJwcmltYXJ5QnRuQmciOiIjYzFjM2I3Iiwic2Vjb25kYXJ5QnRuQmciOiIiLCJsaWdodEJ0bkJnIjoiIn0=",
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
