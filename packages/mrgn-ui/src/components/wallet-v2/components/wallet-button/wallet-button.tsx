import React, { useCallback, useMemo } from "react";

import Image from "next/image";
import Script from "next/script";

import { IconChevronDown, IconBrandX, IconBrandApple, IconBrandGoogle } from "@tabler/icons-react";

import { cn } from "@mrgnlabs/mrgn-utils";

import { WalletInfo, Web3AuthProvider, useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { useWalletStore } from "~/components/wallet-v2/store/wallet.store";
import { Wallet } from "~/components/wallet-v2/wallet";

import { IconMrgn } from "~/components/ui/icons";
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

type WalletButtonProps = {
  className?: string;
  showWalletInfo?: boolean;
};

export const WalletButton = ({ className, showWalletInfo = true }: WalletButtonProps) => {
  const { connected, isLoading, loginWeb3Auth, select, walletContextState } = useWallet();
  const [setIsWalletSignUpOpen] = useWalletStore((state) => [state.setIsWalletSignUpOpen]);

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
      setIsWalletSignUpOpen(true);
    }
  }, [walletInfo, setIsWalletSignUpOpen, select, loginWeb3Auth]);

  return (
    <Button className={cn("gap-1.5 py-0", walletInfo ? "px-2 pl-3" : "px-4", className)} onClick={() => handleWalletConnect()}>
      <div className="flex flex-row relative h-full gap-4">
        <div className="inline-flex items-center gap-2">
          Sign in
          {showWalletInfo && walletInfo && (
            <>
              {" "}
              with
              <WalletIcon />
            </>
          )}
        </div>
        {showWalletInfo && walletInfo && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsWalletSignUpOpen(true);
            }}
            className="pl-2 border-l border-border inline-flex items-center"
          >
            <IconChevronDown size={20} />
          </div>
        )}
      </div>
    </Button>
  );
};
