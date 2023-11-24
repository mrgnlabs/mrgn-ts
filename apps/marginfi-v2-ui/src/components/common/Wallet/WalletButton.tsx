import React, { useCallback, useMemo } from "react";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";

import { useUiStore } from "~/store";
import { WalletInfo, Web3AuthProvider, useWalletContext } from "~/hooks/useWalletContext";

import { Wallet } from "~/components/common/Wallet";
import { IconChevronDown, IconBrandGoogle, IconBrandX, IconBrandApple, IconMrgn } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

const web3AuthIconMap: { [key in Web3AuthProvider]: { icon: JSX.Element } } = {
  google: {
    icon: <IconBrandGoogle />,
  },
  twitter: {
    icon: <IconBrandX />,
  },
  apple: {
    icon: <IconBrandApple />,
  },
  email_passwordless: {
    icon: <IconMrgn />,
  },
};

export const WalletButton = () => {
  const { select, wallets } = useWallet();
  const { connected, loginWeb3Auth } = useWalletContext();
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);

  const walletInfo = useMemo(
    () => (connected ? null : (JSON.parse(localStorage.getItem("walletInfo") ?? "null") as WalletInfo | null)),
    [connected]
  );

  const WalletIcon = useMemo(() => {
    if (walletInfo?.icon) {
      const iconSrc = walletInfo?.icon;
      return function WalletIconComp() {
        return <Image src={iconSrc} alt="wallet_icon" width={24} height={24} />;
      };
    } else {
      return function WalletIconComp() {
        return walletInfo ? web3AuthIconMap[walletInfo.name as Web3AuthProvider]?.icon || <IconMrgn /> : <IconMrgn />;
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
  }, [walletInfo, setIsWalletAuthDialogOpen]);

  return (
    <>
      {!connected ? (
        <Button className="gap-1.5 py-0">
          <div className="flex flex-row relative h-full relative gap-4">
            <div onClick={() => handleWalletConnect()} className="inline-flex items-center gap-2">
              Sign In with {walletInfo && <WalletIcon />}
            </div>
            {walletInfo && (
              <div
                onClick={() => setIsWalletAuthDialogOpen(true)}
                className="pl-1 -mr-2 border-l-2 border-[#0f1010] inline-flex items-center"
              >
                <IconChevronDown />
              </div>
            )}
          </div>
        </Button>
      ) : (
        <Wallet />
      )}
    </>
  );
};
