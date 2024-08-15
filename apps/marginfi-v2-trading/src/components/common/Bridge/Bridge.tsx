import React from "react";
import Script from "next/script";

export const Bridge = () => {
  return (
    <div>
      <Script
        onLoad={() => {
          window.deBridge.widget({
            v: "1",
            element: "debridgeWidget",
            title: "",
            description: "",
            width: "328",
            height: "",
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
        }}
        src="https://app.debridge.finance/assets/scripts/widget.js"
      />
    </div>
  );
};
