import React, { useCallback, useMemo } from "react";

import Image from "next/image";

import { IconChevronDown, IconBrandX, IconBrandApple, IconBrandGoogle } from "@tabler/icons-react";

import { cn } from "@mrgnlabs/mrgn-utils";

import { WalletInfo, Web3AuthProvider, useWallet } from "~/components/wallet-v2";
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
  const { loginWeb3Auth, select, isLoading } = useWallet();
  const [setIsWalletSignUpOpen] = useWalletStore((state) => [state.setIsWalletSignUpOpen]);

  const walletInfo = useMemo(() => JSON.parse(localStorage.getItem("walletInfo") ?? "null") as WalletInfo, []);

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
    <div className={cn("flex flex-row relative py-0", walletInfo ? "px-2 pl-3" : "px-4", className)}>
      <Button
        onClick={handleWalletConnect}
        disabled={isLoading}
        className={cn(
          " gap-1.5 py-0 px-3",
          walletInfo && showWalletInfo && !isLoading ? "rounded-r-none" : "rounded-md",
          "flex-1"
        )}
      >
        <div className="inline-flex items-center gap-2">
          {isLoading ? (
            "Loading..."
          ) : (
            <>
              Sign in
              {showWalletInfo && walletInfo && (
                <>
                  {" "}
                  with
                  <WalletIcon />
                </>
              )}
            </>
          )}
        </div>
      </Button>
      {!isLoading && showWalletInfo && walletInfo && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            setIsWalletSignUpOpen(true);
          }}
          disabled={isLoading}
          size="default"
          className="rounded-l-none px-2 py-0 border-l-0"
        >
          <IconChevronDown size={20} />
        </Button>
      )}
    </div>
  );
};
