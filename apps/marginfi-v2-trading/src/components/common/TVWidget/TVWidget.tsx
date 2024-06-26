"use client";

import React from "react";
import { useWebSocket } from "./useWebSocket";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { usePrevious } from "~/utils";

interface props {
  token: ExtendedBankInfo;
}

export const TVWidget = ({ token }: props) => {
  const container = React.useRef<HTMLDivElement>(null);
  const { socket, subscribeOnStream, unsubscribeFromStream } = useWebSocket();
  const prevToken = usePrevious(token);

  React.useEffect(() => {
    const isChanged = !prevToken?.address.equals(token.address);
    if (!container.current || !isChanged) return;
    const script = document.createElement("script");
    script.src = "/tradingview/charting_library/charting_library.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
      new window.TradingView.widget({
        symbol: token.info.rawBank.mint.toString(), // default symbol
        interval: "30" as any, // default interval
        container: "tv_chart_container",
        locale: "en",
        theme: "dark",
        height: 600,
        width: 900,
        autosize: false,
        custom_css_url: "/tradingview/custom.css",
        header_widget_buttons_mode: "compact",
        disabled_features: ["header_symbol_search", "header_quick_search", "header_compare"],
        custom_formatters: {
          priceFormatterFactory: (symbolInfo, minTick) => {
            if (symbolInfo === null) {
              return null;
            }

            return {
              format: (price, signPositive) => {
                if (price >= 1000000000) {
                  return `${(price / 1000000000).toFixed(3)}B`;
                }

                if (price >= 1000000) {
                  return `${(price / 1000000).toFixed(3)}M`;
                }

                if (price >= 1000) {
                  return `${(price / 1000).toFixed(3)}K`;
                }

                return price.toFixed(2);
              },
              // };
            };
            return null; // The default formatter will be used.
          },
        },
        datafeed: {
          onReady: (callback) => {
            fetch("/api/datafeed?action=config")
              .then((response) => response.json())
              .then((data) => callback(data));
          },
          searchSymbols: (userInput, exchange, symbolType, onResultReadyCallback) => {
            fetch(`/api/datafeed?action=search&query=${userInput}`)
              .then((response) => response.json())
              .then((data) => onResultReadyCallback(data));
          },
          resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
            fetch(`/api/datafeed?action=resolve&symbol=${symbolName}`)
              .then((response) => response.json())
              .then((data) => onSymbolResolvedCallback(data))
              .catch((err) => onResolveErrorCallback(err));
          },
          getBars: async (symbolInfo, resolution, periodParams, onResult, onError) => {
            try {
              const response = await fetch(
                `/api/datafeed?action=history&symbol=${symbolInfo.name}&resolution=${resolution}&from=${
                  periodParams.from
                }&to=${periodParams.to}&address=${(symbolInfo as any)?.address}&firstDataRequest=${
                  periodParams.firstDataRequest
                }`
              );

              const data = await response.json();

              if (!data.success) throw new Error("Error fetching history");

              if (data?.noData) {
                onResult([], { noData: true });
              } else {
                onResult(data.bars, { noData: false });
              }
            } catch (err: any) {
              onError(err);
            }
          },
          subscribeBars: async (
            symbolInfo,
            resolution,
            onRealtimeCallback,
            subscriberUID,
            onResetCacheNeededCallback
          ) => {
            const response = await fetch(`/api/datafeed?action=cache`);
            const data = await response.json();

            const lastBarsCacheMap = new Map(data.lastBarsCacheArray);

            subscribeOnStream(
              symbolInfo as any,
              resolution,
              onRealtimeCallback,
              lastBarsCacheMap.get((symbolInfo as any).address) as any
            );
          },
          unsubscribeBars: (subscriberUID) => {
            const msg = {
              type: "UNSUBSCRIBE_PRICE",
            };

            // ws.current?.send(JSON.stringify(msg));
          },
        },
        library_path: "/tradingview/charting_library/",
      });
    };
    container.current.appendChild(script);

    // return () => {
    //   if (!container.current) return;
    //   container.current.removeChild(script);
    // };
  }, [container, token, prevToken]);

  return (
    <div id="tv_chart_container" ref={container} className="relative"></div>
    // <div className="tradingview-widget-container" >
    //   <div
    //     className="tradingview-widget-container__widget"
    //     style={{ height: "calc(100% - 32px)", width: "120%" }}
    //   ></div>
    // </div>
  );
};
