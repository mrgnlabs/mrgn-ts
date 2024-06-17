"use client";

import React from "react";

export const TVWidget = () => {
  const container = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!container.current) return;
    const script = document.createElement("script");
    script.src = "/tradingview/charting_library/charting_library.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
      new window.TradingView.widget({
        container_id: "tv_chart_container",
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
          getBars: (symbolInfo, resolution, periodParams, onResult, onError) => {
            fetch(
              `/api/datafeed?action=history&symbol=${symbolInfo.name}&resolution=${resolution}&from=${
                periodParams.from
              }&to=${periodParams.to}&address=${(symbolInfo as any)?.address}&firstDataRequest=${
                periodParams.firstDataRequest
              }`
            )
              .then((response) => response.json())
              .then((data) => {
                if (data?.noData || !data?.length) {
                  onResult([], { noData: true });
                } else if (data.length) {
                  onResult(data, { noData: false });
                }
              })
              .catch((err) => onError(err));
          },
          subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
            const msg = {
              type: "SUBSCRIBE_PRICE",
              data: {
                resolution,
                lastBar: symbolInfo.lastBar,
                address: symbolInfo.address,
              },
            };

            ws.current?.send(JSON.stringify(msg));
          },
          unsubscribeBars: (subscriberUID) => {
            const msg = {
              type: "UNSUBSCRIBE_PRICE",
            };

            ws.current?.send(JSON.stringify(msg));
          },
        },
        library_path: "/charting_library/",
        // Add your configuration options here
      });
    };
    container.current.appendChild(script);

    return () => {
      if (!container.current) return;
      container.current.removeChild(script);
    };
  }, [container]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
      <div
        className="tradingview-widget-container__widget"
        style={{ height: "calc(100% - 32px)", width: "120%" }}
      ></div>
    </div>
  );
};
