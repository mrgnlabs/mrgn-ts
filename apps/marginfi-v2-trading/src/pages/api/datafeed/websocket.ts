import { NextApiRequest, NextApiResponse } from "next";
import { Server } from "http";
import WebSocket from "ws";
import { getNextBarTime } from "~/utils/tradingViewUtils";
// import { parseResolution, getNextBarTime, BE_API_KEY } from './helpers'; // Adjust the import path as needed

let wsServer: WebSocket.Server | null = null;

export default (req: NextApiRequest, res: NextApiResponse) => {
  if (!(res.socket as any)?.server?.ws) {
    console.log("Initializing WebSocket server...");
    wsServer = new WebSocket.Server({ noServer: true });

    wsServer.on("connection", (ws) => {
      let subscriptionItem: any | null = null;

      ws.on("message", (message) => {
        const msg = JSON.parse(message.toString());

        if (msg.type === "SUBSCRIBE_PRICE") {
          subscriptionItem = msg.subscriptionItem;
          const { chartType, address, currency } = msg.data;
          const resolution = msg.resolution;
          const lastBar = msg.lastBar;

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
            if (!subscriptionItem) return;

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

            ws.send(JSON.stringify(bar));
            // if (subscriptionItem) {
            //   subscriptionItem.lastBar = bar;
            //   subscriptionItem.callback(bar);
            // }
          });

          //   subscriptionItem = {
          //     resolution,
          //     lastBar,
          //     callback: (bar: any) => {
          //       ws.send(JSON.stringify(bar));
          //     },
          //   };

          socket.send(
            JSON.stringify({
              type: "SUBSCRIBE_PRICE",
              data: {
                chartType,
                address,
                currency,
              },
            })
          );
        }

        if (msg.type === "UNSUBSCRIBE_PRICE") {
          // Handle unsubscribe logic here
        }
      });
    });

    const server = (res.socket as any)?.server as unknown as Server;
    server.on("upgrade", (req, socket, head) => {
      if (wsServer) {
        wsServer.handleUpgrade(req, socket as any, head, (ws) => {
          wsServer?.emit("connection", ws, req);
        });
      }
    });

    (res.socket as any).server.ws = wsServer;
  } else {
    console.log("WebSocket server already initialized");
  }
  res.end();
};
