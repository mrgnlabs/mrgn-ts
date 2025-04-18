import React from "react";
import { usePrevious } from "@mrgnlabs/mrgn-utils";

import { ChartingLibraryFeatureset } from "../../../../public/tradingview";
import { useTradeStoreV2 } from "~/store";
import { ArenaPoolV2 } from "~/types/trade-store.types";
import { usePositionsData } from "~/hooks/usePositionsData";

interface props {
  activePool: ArenaPoolV2;
}

export const TVWidget = ({ activePool }: props) => {
  const [banksByBankPk] = useTradeStoreV2((state) => [state.banksByBankPk]);
  const positionData = usePositionsData({ groupPk: activePool.groupPk });

  const { token, quote } = React.useMemo(() => {
    const token = banksByBankPk[activePool.tokenBankPk.toBase58()];
    const quote = banksByBankPk[activePool.quoteBankPk.toBase58()];
    return { token, quote };
  }, [banksByBankPk, activePool]);

  const container = React.useRef<HTMLDivElement>(null);
  const prevToken = usePrevious(token);
  const prevPositionData = usePrevious(positionData);

  React.useEffect(() => {
    if (!container.current) return;

    if (prevToken?.address.equals(token.address) && prevPositionData?.entryPrice === positionData?.entryPrice) return;

    const isMobile = window.innerWidth < 1024;
    const script = document.createElement("script");

    const disabledFeats: ChartingLibraryFeatureset[] = [
      "header_symbol_search",
      "header_quick_search",
      "header_compare",
    ];

    if (isMobile) {
      disabledFeats.push("left_toolbar", "header_widget", "control_bar");
    }

    script.src = "/tradingview/charting_library/charting_library.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
      const tvWidget = new window.TradingView.widget({
        symbol: token.info.rawBank.mint.toString(), // default symbol
        interval: "30" as any, // default interval
        container: "tv_chart_container",
        locale: "en",
        theme: "light",
        overrides: {
          "paneProperties.background": "#ffffff",
          "paneProperties.backgroundType": "solid",
          "mainSeriesProperties.candleStyle.downColor": "#f08f84",
          "mainSeriesProperties.candleStyle.upColor": "#7ed3a4",
          "mainSeriesProperties.candleStyle.borderUpColor": "#7ed3a4",
          "mainSeriesProperties.candleStyle.borderDownColor": "#f08f84",
          "mainSeriesProperties.candleStyle.wickUpColor": "#7ed3a4",
          "mainSeriesProperties.candleStyle.wickDownColor": "#f08f84",
        },
        height: isMobile ? 400 : 600,
        width: container.current?.offsetWidth || 900,
        autosize: false,
        header_widget_buttons_mode: "compact",
        disabled_features: disabledFeats,
        enabled_features: ["move_logo_to_main_pane"],
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

                if (price < 0.000001) {
                  return price.toFixed(10);
                }

                return price.toFixed(7);
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
            fetch(
              `/api/datafeed?action=resolve&requested=${symbolName}&symbol=${token.meta.tokenSymbol}&address=${token.info.state.mint}&quoteSymbol=${quote.meta.tokenSymbol}`
            )
              .then((response) => response.json())
              .then((data) => onSymbolResolvedCallback(data))
              .catch((err) => onResolveErrorCallback(err));
          },
          getBars: async (symbolInfo, resolution, periodParams, onResult, onError) => {
            try {
              const response = await fetch(
                `/api/datafeed?action=history&symbol=${symbolInfo.name}&resolution=${resolution}&from=${
                  periodParams.from
                }&to=${periodParams.to}&quote=${quote.info.state.mint.toBase58()}&address=${
                  (symbolInfo as any)?.address
                }&firstDataRequest=${periodParams.firstDataRequest}`
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

            // subscribeOnStream(
            //   symbolInfo as any,
            //   resolution,
            //   onRealtimeCallback,
            //   lastBarsCacheMap.get((symbolInfo as any).address) as any
            // );
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

      tvWidget.onChartReady(() => {
        if (token.isActive && token.position) {
          const liquidationPrice = token.position.liquidationPrice;
          if (liquidationPrice) {
            const chart = tvWidget.chart();
            chart.createShape(
              { price: liquidationPrice, time: chart.getVisibleRange().to },
              {
                shape: "horizontal_line",
                text: "Liquidation price",
                overrides: {
                  linecolor: "#e07d6f",
                  linestyle: 2,
                  linewidth: 2,
                  showLabel: true,
                  textcolor: "#e07d6f",
                  fontsize: 12,
                },
              }
            );
          }
        }

        if (positionData?.entryPrice) {
          const chart = tvWidget.chart();
          chart.createShape(
            { price: positionData?.entryPrice, time: chart.getVisibleRange().to },
            {
              shape: "horizontal_line",
              text: "Entry price",
              overrides: {
                linecolor: "#a4a4ac",
                linestyle: 2,
                linewidth: 2,
                showLabel: true,
                textcolor: "#a4a4ac",
                fontsize: 12,
              },
            }
          );
        }
      });
    };
    container.current.appendChild(script);
  }, [
    container,
    token,
    prevToken,
    positionData,
    prevPositionData?.entryPrice,
    quote.meta.tokenSymbol,
    quote.info.state.mint,
  ]);

  return <div id="tv_chart_container" ref={container} className="relative"></div>;
};
