import { useEffect, useState } from "react";
// import { useTranslation } from 'react-i18next';
import { AuthorizationResponse, base64RawURLEncode, getChallenge, getED25519KeyPair } from "@mixin.dev/mixin-node-sdk";
import ReconnectingWebSocket from "reconnecting-websocket";
import pako from "pako";
import { v4 } from "uuid";
import { useAppStore } from "../../../../store";
import { compare } from "../../../../utils/date";
import { MixinModal } from "./MixinModal";
import { Button } from "~/components/ui/button";
import { IconX } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";

export function MixinLoginModal(props: { isOpen: boolean; onClose: () => void }) {
  const { user, getMixinClient, setKeystore, getMe } = useAppStore((s) => ({
    user: s.user,
    getMixinClient: s.getMixinClient,
    setKeystore: s.setKeystore,
    getMe: s.getMe,
  }));

  const [loginCode, setLoginCode] = useState("");
  const [error, setError] = useState<string>();

  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID as string;
  const scope = "PROFILE:READ ASSETS:READ SNAPSHOTS:READ";
  const { verifier, challenge } = getChallenge();

  const handleLogin = async (code: string) => {
    const { seed, publicKey } = getED25519KeyPair();

    try {
      let client = getMixinClient();
      const { scope, authorization_id } = await client.oauth.getToken({
        client_id: clientId,
        code,
        ed25519: base64RawURLEncode(publicKey),
        code_verifier: verifier,
      });

      if (!scope || scope.indexOf("ASSETS:READ") < 0 || scope.indexOf("SNAPSHOTS:READ") < 0) {
        setError("授权范围不足");
        return;
      }

      client = setKeystore({
        app_id: clientId,
        scope,
        authorization_id,
        session_private_key: seed.toString("hex"),
      });
      await getMe();
      props.onClose();
    } catch (e: any) {
      console.error("Login failed:", e);
      setError(e instanceof Error ? e.message : "登录失败");
    }
  };

  useEffect(() => {
    let ws: ReconnectingWebSocket | null = null;

    if (props.isOpen) {
      const endpoint = "wss://blaze.mixin.one";
      ws = new ReconnectingWebSocket(endpoint, "Mixin-OAuth-1", {
        maxReconnectionDelay: 5000,
        minReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1.2,
        connectionTimeout: 8000,
        maxRetries: Infinity,
        debug: false,
      });

      const send = (msg: any) => {
        try {
          if (ws) ws.send(pako.gzip(JSON.stringify(msg)));
        } catch (e) {
          if (!(e instanceof DOMException)) console.error(e);
        }
      };

      const sendRefreshCode = (authorization: any) => {
        send({
          id: v4().toUpperCase(),
          action: "REFRESH_OAUTH_CODE",
          params: {
            client_id: clientId,
            scope,
            code_challenge: challenge,
            authorization_id: authorization ? authorization.authorization_id : "",
          },
        });
      };

      ws.onopen = () => {
        console.log("WebSocket connected");
        sendRefreshCode("");
      };

      ws.onmessage = (event) => {
        const fileReader = new FileReader();
        fileReader.onload = function () {
          const msg = this.result ? pako.ungzip(new Uint8Array(this.result as ArrayBuffer), { to: "string" }) : "{}";
          const authorization = JSON.parse(msg);
          console.log("Received authorization:", authorization);

          if (authorization.data) {
            if (!loginCode) {
              setLoginCode(`mixin://codes/${authorization.data.code_id}`);
            }

            if (authorization.data.authorization_code && authorization.data.authorization_code.length > 16) {
              handleLogin(authorization.data.authorization_code);
              return;
            }

            setTimeout(() => {
              sendRefreshCode(authorization.data);
            }, 1000);
          }
        };
        fileReader.readAsArrayBuffer(event.data);
      };
    }

    return () => {
      if (ws) {
        ws.close();
      }
      setLoginCode("");
      setError(undefined);
    };
  }, [props.isOpen]);

  useEffect(() => {
    if (!user) return;
    setLoginCode("");
  }, [user]);

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-medium">登录 Mixin</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          {error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : loginCode ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">请使用 Mixin Messenger 扫描二维码登录</p>
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(loginCode)}`}
                  alt="Login QR Code"
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm text-muted-foreground">或点击下方链接</p>
              <Button variant="outline" className="w-full" onClick={() => window.open(loginCode, "_blank")}>
                在 Mixin Messenger 中打开
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">正在生成登录二维码...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
