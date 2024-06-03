import React, { useCallback, useMemo } from "react";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";

import { useUiStore } from "~/store";
import { WalletInfo, Web3AuthProvider, useWalletContext } from "~/hooks/useWalletContext";
import { cn } from "~/utils";

import { Wallet } from "~/components/common/Wallet";
import { IconChevronDown, IconBrandGoogle, IconBrandX, IconBrandApple, IconMrgn } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

const web3AuthIconMap: { [key in Web3AuthProvider]: { icon: JSX.Element } } = {
  google: {
    icon: <IconBrandGoogle size={20} />,
  },
  twitter: {
    icon: <IconBrandX size={20} />,
  },
  apple: {
    icon: <IconBrandApple size={20} />,
  },
  email_passwordless: {
    icon: <IconMrgn size={20} />,
  },
};

export const WalletButton = () => {
  const { select } = useWallet();
  const { connected, connecting, isLoading, loginWeb3Auth } = useWalletContext();
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);

  const walletInfo = useMemo(() => JSON.parse(localStorage.getItem("walletInfo") ?? "null") as WalletInfo, []);

  const isMoongate = useMemo(() => walletInfo?.name === "Ethereum Wallet", [walletInfo]);

  const WalletIcon = useMemo(() => {
    if (walletInfo?.icon) {
      const iconSrc = walletInfo?.icon;
      return function WalletIconComp() {
        return <Image src={iconSrc} alt="wallet_icon" width={20} height={20} />;
      };
    } else {
      return function WalletIconComp() {
        return walletInfo ? (
          web3AuthIconMap[walletInfo.name as Web3AuthProvider]?.icon || <IconMrgn size={20} />
        ) : (
          <IconMrgn size={20} />
        );
      };
    }
  }, [walletInfo]);

  const handleWalletConnect = useCallback(() => {
    try {
      if (!walletInfo) throw new Error("No local storage");
      if (walletInfo.web3Auth) {
        if (walletInfo.name === "email_passwordless") {
          loginWeb3Auth("email_passwordless", { login_hint: walletInfo.email });
        } else {
          loginWeb3Auth(walletInfo.name);
        }
      } else {
        select(walletInfo.name as any);
      }
    } catch (error) {
      setIsWalletAuthDialogOpen(true);
    }
  }, [walletInfo, setIsWalletAuthDialogOpen, select, loginWeb3Auth]);

  return (
    <>
      {!isLoading && !connected && (
        <Button variant="secondary" className={`gap-1.5 py-0 ${walletInfo ? "pr-2" : "pr-4"}`}>
          <div className="flex flex-row relative h-full gap-4">
            <div onClick={() => handleWalletConnect()} className="inline-flex items-center gap-2">
              Sign in
              {walletInfo && (
                <>
                  {" "}
                  with
                  <WalletIcon />
                </>
              )}
            </div>
            {walletInfo && (
              <div
                onClick={() => setIsWalletAuthDialogOpen(true)}
                className="pl-2 border-l border-border inline-flex items-center"
              >
                <IconChevronDown size={20} />
              </div>
            )}
          </div>
        </Button>
      )}

      {connected && (
        <div className={cn(isMoongate && "pr-12")}>
          <Wallet />
        </div>
      )}
    </>
  );
};
