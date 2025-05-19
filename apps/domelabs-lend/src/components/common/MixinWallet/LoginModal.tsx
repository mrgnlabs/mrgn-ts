/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@mrgnlabs/mrgn-ui/src/components/ui/dialog";
import { Button } from "@mrgnlabs/mrgn-ui/src/components/ui/button";
import QRCode from "react-qr-code";
import {
  AuthorizationResponse,
  base64RawURLEncode,
  getChallenge,
  getED25519KeyPair,
  type OAuthKeystore,
} from "@mixin.dev/mixin-node-sdk";
import { useAuthorization } from "../../../hooks";
import { useAppStore } from "../../../store";
import { BOT } from "@mrgnlabs/mrgn-common";
import Link from "next/link";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export const LoginModal = ({ open, onClose }: LoginModalProps) => {
  const [loginCode, setLoginCode] = useState("");
  const [error, setError] = useState<string>();
  const { getMixinClient, setKeystore, getMe } = useAppStore((s) => ({
    getMixinClient: s.getMixinClient,
    setKeystore: s.setKeystore,
    getMe: s.getMe,
  }));

  const handleLogin = async (code: string, codeVerifier: string) => {
    const client = getMixinClient();
    if (!client) return;
    const { seed, publicKey } = getED25519KeyPair();

    try {
      const { scope, authorization_id } = await client.oauth.getToken({
        client_id: BOT,
        code: code,
        ed25519: base64RawURLEncode(publicKey),
        code_verifier: codeVerifier,
      });

      if (!scope || scope.indexOf("ASSETS:READ") < 0 || scope.indexOf("SNAPSHOTS:READ") < 0) {
        setError("授权范围不足");
        return;
      }

      const keystore: OAuthKeystore = {
        app_id: BOT,
        scope,
        authorization_id,
        session_private_key: seed.toString("hex"),
      };
      setKeystore(keystore);
      await getMe();
      onClose();
    } catch (e) {
      console.error("Login failed:", e);
      setError(e instanceof Error ? e.message : "登录失败");
    }
  };

  useEffect(() => {
    let ws: any;

    if (open) {
      const scope = "PROFILE:READ ASSETS:READ SNAPSHOTS:READ";
      const { verifier, challenge } = getChallenge();

      ws = useAuthorization(BOT, scope, challenge, (a: AuthorizationResponse) => {
        console.log("a", a);
        if (a && !loginCode) {
          setLoginCode(`mixin://codes/${a.code_id}`);
        }

        if (a.authorization_code && a.authorization_code.length > 16) {
          handleLogin(a.authorization_code, verifier);
          return true;
        }

        return false;
      });
    }

    return () => {
      if (ws) {
        ws.close();
      }
      setLoginCode("");
      setError(undefined);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[378px] bg-background-gray border-nav-dark-border">
        <div className="w-[300px] h-[300px] mx-auto">
          {loginCode ? (
            <>
              <QRCode value={loginCode} level="H" size={300} className="w-full h-full dark:bg-white p-4 rounded-lg" />
              <Button
                variant="default"
                size="lg"
                className="mt-4 w-full"
                onClick={() => window.open(loginCode, "_blank", "noopener,noreferrer")}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Connect Wallet
              </Button>
            </>
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
          )}
        </div>
        <div className="text-center mt-4 text-nav-light-text dark:text-nav-dark-text">
          {error ? <div className="text-red-500">{error}</div> : "请使用 Mixin 扫码登录"}
        </div>
      </DialogContent>
    </Dialog>
  );
};
