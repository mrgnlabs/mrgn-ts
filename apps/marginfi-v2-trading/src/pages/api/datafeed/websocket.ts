// pages/api/websocket.ts
import { NextApiRequest, NextApiResponse } from "next";
import { Server } from "ws";
import { parseResolution } from ".";

let wsServer: any;
let subscriptionItem: any = {};

export function getNextBarTime(lastBar: any, resolution = "1D" as any) {
  if (!lastBar) return;

  const lastCharacter = resolution.slice(-1);
  let nextBarTime;

  switch (true) {
    case lastCharacter === "W":
      nextBarTime = 7 * 24 * 60 * 60 * 1000 + lastBar.time;
      break;

    case lastCharacter === "D":
      nextBarTime = 1 * 24 * 60 * 60 * 1000 + lastBar.time;
      break;

    default:
      nextBarTime = resolution * 60 * 1000 + lastBar.time;
      break;
  }

  return nextBarTime;
}

// Create WebSocket server
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!wsServer && (res.socket as any)?.server) {
    wsServer = createWebSocketServer((res.socket as any)?.server);
  }

  res.end();
}

const createWebSocketServer = (server: any) => {
  const wsServer = new Server({ server });

  wsServer.on("connection", (ws) => {
    const socket = new WebSocket(
      `wss://public-api.birdeye.so/socket?x-api-key=${process.env.BIRDEYE_API_KEY}`,
      "echo-protocol"
    );

    socket.addEventListener("open", () => {
      console.log("[socket] Connected");
    });

    socket.addEventListener("message", (msg) => {
      const data = JSON.parse(msg.data);

      if (data.type !== "PRICE_DATA") return console.log(data);

      const currTime = data.data.unixTime * 1000;
      const lastBar = subscriptionItem.lastBar;
      const resolution = subscriptionItem.resolution;
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

      subscriptionItem.lastBar = bar;
      subscriptionItem.callback(bar);

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
