import React from "react";

import { OnrampScreenProps } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";
import { useWalletContext } from "~/hooks/useWalletContext";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const BridgeToken: React.FC<props> = ({ onNext }: props) => {
  const { wallet } = useWalletContext();
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
      width: isMobile ? "400" : "460",
      height: "500",
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
    <ScreenWrapper>
      <div className="flex justify-center overflow-y-scroll">
        <div id="debridgeWidget"></div>
      </div>
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};
