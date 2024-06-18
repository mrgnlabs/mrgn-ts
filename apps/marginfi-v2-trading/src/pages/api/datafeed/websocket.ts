// pages/api/websocket.ts
import { NextApiRequest, NextApiResponse } from "next";
import { Server } from "ws";
import { getNextBarTime, parseResolution } from "~/utils/tradingViewUtils";

type SocketServer = {
  wss: Server;
};

// Create WebSocket server
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(res.socket as any).server.wss) {
    createWebSocketServer();
  }

  res.end();
}

const createWebSocketServer = () => {
  const wsServer = new Server({ noServer: true });

  wsServer.on("connection", (ws) => {
    const socket = new WebSocket(
      `wss://public-api.birdeye.so/socket?x-api-key=${process.env.BIRDEYE_API_KEY}`,
      "echo-protocol"
    );

    socket.addEventListener("open", () => {
      console.log("[socket] Connected");
    });

    socket.addEventListener("message", (msg) => {
      const data = JSON.parse(msg.data).data;

      if (data.type !== "PRICE_DATA") return console.log(data);

      const currTime = data.unixTime * 1000;
      const lastBar = data.lastBar;
      const resolution = data.resolution;
      const nextBarTime = getNextBarTime(lastBar, resolution);

      let bar;

      if (currTime >= nextBarTime) {
        bar = {
          time: nextBarTime,
          open: data.data.o,
          high: data.data.h,
          low: data.data.l,
          close: data.data.c,
          volume: data.data.v,
        };
        console.log("[socket] Generate new bar");
      } else {
        bar = {
          ...lastBar,
          high: Math.max(lastBar.high, data.data.h),
          low: Math.min(lastBar.low, data.data.l),
          close: data.data.c,
          volume: data.data.v,
        };
        console.log("[socket] Update the latest bar by price");
      }

      data.lastBar = bar;
      data.callback(bar);

      // Forward message to client
      ws.send(JSON.stringify(bar));
    });

    ws.on("message", (message) => {
      const msg = JSON.parse(message.toString());

      if (msg.type === "SUBSCRIBE_PRICE") {
        subscriptionItem = {
          resolution: msg.data.resolution,
          lastBar: msg.data.lastBar,
          callback: (data: any) => ws.send(JSON.stringify(data)),
        };

        const subscribeMsg = {
          type: "SUBSCRIBE_PRICE",
          data: {
            chartType: parseResolution(msg.data.resolution),
            address: msg.data.address,
            currency: "usd",
          },
        };

        socket.send(JSON.stringify(subscribeMsg));
      } else if (msg.type === "UNSUBSCRIBE_PRICE") {
        const unsubscribeMsg = {
          type: "UNSUBSCRIBE_PRICE",
        };
        socket.send(JSON.stringify(unsubscribeMsg));
      }
    });
  });

  return wsServer;
};
