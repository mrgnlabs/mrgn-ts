import React from "react";
import { useEffect } from "react";

import { Bar, getNextBarTime, parseResolution } from "~/utils/tradingViewUtils";

interface SymbolInfo {
  address: string;
}

interface SubscriptionItem {
  resolution: string;
  lastBar: Bar;
  callback: (bar: Bar) => void;
}

const subscriptionItemDefault: SubscriptionItem = {
  resolution: "",
  lastBar: { time: 0, open: 0, high: 0, low: 0, close: 0, volume: 0 },
  callback: () => {},
};

export const useWebSocket = () => {
  const socketRef = React.useRef<WebSocket | null>(null);
  const [subscriptionItem, setSubscriptionItem] = React.useState<SubscriptionItem | null>(subscriptionItemDefault);

  useEffect(() => {
    // Create WebSocket connection.
    const socket = new WebSocket(`ws://${window.location.host}/api/datafeed/websocket`);
    socketRef.current = socket;

    // Connection opened
    socket.addEventListener("open", (event) => {
      console.log("[socket] Connected");
    });

    // Listen for messages
    socket.addEventListener("message", (msg) => {
      const data = JSON.parse(msg.data);
      console.log({ data });
      // setSubscriptionItem((prev) => (prev ? { ...prev, lastBar: bar } : null));
      // subscriptionItem.callback(bar);
    });

    socket.addEventListener("close", () => {
      console.log("[socket] Closed");
    });

    socket.addEventListener("error", (error) => {
      console.error("[socket] Error:", error);
    });

    return () => {
      socket.close();
    };
  }, []);

  const subscribeOnStream = (
    symbolInfo: SymbolInfo,
    resolution: string,
    onRealtimeCallback: (bar: Bar) => void,
    lastBar: Bar
  ) => {
    const item = {
      resolution,
      lastBar,
      callback: onRealtimeCallback,
    };

    setSubscriptionItem(item);

    const msg = {
      type: "SUBSCRIBE_PRICE",
      data: {
        chartType: parseResolution(resolution),
        address: symbolInfo.address,
        currency: "usd",
      },
      subscriptionItem: item,
    };

    socketRef.current?.send(JSON.stringify(msg));
  };

  const unsubscribeFromStream = () => {
    const msg = {
      type: "UNSUBSCRIBE_PRICE",
    };

    socketRef.current?.send(JSON.stringify(msg));
  };

  return {
    socket: socketRef.current,
    subscribeOnStream,
    unsubscribeFromStream,
  };
};
