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
        symbol: "", // default symbol
        interval: "1D" as any, // default interval
        container: "tv_chart_container",
        locale: "en",
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
              console.log({ symbolInfo });

              const response = await fetch(
                `/api/datafeed?action=history&symbol=${symbolInfo.name}&resolution=${resolution}&from=${
                  periodParams.from
                }&to=${periodParams.to}&address=${(symbolInfo as any)?.address}&firstDataRequest=${
                  periodParams.firstDataRequest
                }`
              );

              console.log("exit");

              const data = await response.json();

              console.log({ data });
              if (data?.noData) {
                onResult([], { noData: true });
              } else {
                onResult(data.bars, { noData: false });
              }
            } catch (err: any) {
              onError(err);
            }

            // .then((response) => {
            //   console.log("hihi");
            //   console.log({ data: response.json() });
            //   return response.json();
            // })
            // .then((data) => {
            //   console.log({ data });
            //   if (data?.noData || !data?.length) {
            //     onResult([], { noData: true });
            //   } else if (data.length) {
            //     onResult(data, { noData: false });
            //   }
            // })
            // .catch((err) => onError(err));
          },
          subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
            // const msg = {
            //   type: "SUBSCRIBE_PRICE",
            //   data: {
            //     resolution,
            //     lastBar: symbolInfo.lastBar,
            //     address: symbolInfo.address,
            //   },
            // };
            // ws.current?.send(JSON.stringify(msg));
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
  }, [container]);

  return (
    <div id="tv_chart_container" ref={container} style={{ height: "100%", width: "100%" }}></div>
    // <div className="tradingview-widget-container" >
    //   <div
    //     className="tradingview-widget-container__widget"
    //     style={{ height: "calc(100% - 32px)", width: "120%" }}
    //   ></div>
    // </div>
  );
};
