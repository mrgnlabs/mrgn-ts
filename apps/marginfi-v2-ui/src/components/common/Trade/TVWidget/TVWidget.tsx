"use client";

import React from "react";

export const TVWidget = () => {
  const container = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!container.current) return;
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
        {
          "autosize": true,
          "symbol": "CRYPTO:SOLUSD",
          "interval": "5",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "backgroundColor": "rgb(13, 16, 18)",
          "hide_top_toolbar": true,
          "allow_symbol_change": false,
          "save_image": false,
          "calendar": false,
          "support_host": "https://www.tradingview.com"
        }`;
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
