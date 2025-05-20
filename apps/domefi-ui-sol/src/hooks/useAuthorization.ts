import ReconnectingWebSocket from "reconnecting-websocket";
import pako from "pako";
import { v4 } from "uuid";

export const useAuthorization = (
  clientId: string,
  scope: string,
  codeChallenge: string,
  callback: (data: any) => boolean
) => {
  const endpoint = "wss://blaze.mixin.one";

  let handled = false;
  const ws = new ReconnectingWebSocket(endpoint, "Mixin-OAuth-1", {
    maxReconnectionDelay: 5000,
    minReconnectionDelay: 1000,
    reconnectionDelayGrowFactor: 1.2,
    connectionTimeout: 8000,
    maxRetries: Infinity,
    debug: false,
  });

  const send = (msg: any) => {
    try {
      ws.send(pako.gzip(JSON.stringify(msg)));
    } catch (e) {
      if (e instanceof DOMException) {
      } else {
        console.error(e);
      }
    }
  };

  const sendRefreshCode = (authorization: any) => {
    if (handled) {
      return;
    }

    send({
      id: v4().toUpperCase(),
      action: "REFRESH_OAUTH_CODE",
      params: {
        client_id: clientId,
        scope,
        code_challenge: codeChallenge,
        authorization_id: authorization ? authorization.authorization_id : "",
      },
    });
  };

  ws.addEventListener("message", function (event) {
    if (handled) {
      return;
    }
    const fileReader = new FileReader();
    fileReader.onload = function () {
      const msg = this.result
        ? pako.ungzip(new Uint8Array(this.result as ArrayBuffer), {
            to: "string",
          })
        : "{}";
      const authorization = JSON.parse(msg);
      if (callback(authorization.data)) {
        handled = true;
        return;
      }
      setTimeout(function () {
        sendRefreshCode(authorization.data);
      }, 1000);
    };
    fileReader.readAsArrayBuffer(event.data);
  });

  ws.addEventListener("open", function () {
    sendRefreshCode(codeChallenge);
  });

  return ws;
};
