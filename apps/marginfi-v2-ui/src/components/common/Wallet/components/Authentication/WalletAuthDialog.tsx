import React from "react";

import Image from "next/image";
import Link from "next/link";

import { useWallet } from "@solana/wallet-adapter-react";

import { useUiStore } from "~/store";
import { useOs } from "~/hooks/useOs";
import { useIsMobile } from "~/hooks/useIsMobile";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Web3AuthSocialProvider } from "~/hooks/useWalletContext";
import { cn } from "~/utils";

import { WalletAuthButton, WalletAuthEmailForm } from "~/components/common/Wallet";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import {
  IconMrgn,
  IconBrandX,
  IconBrandApple,
  IconBrandGoogle,
  IconBraveWallet,
  IconCoinbaseWallet,
  IconPhantomWallet,
  IconBackpackWallet,
  IconSolflareWallet,
  IconWalletConnectWallet,
  IconGlowWallet,
  IconTrustWallet,
  IconEthereum,
  IconChevronDown,
  IconStarFilled,
} from "~/components/ui/icons";

enum WalletAuthDialogState {
  DEFAULT,
  SOCIAL,
  WALLET,
}

// social login options
const socialProviders: {
  name: Web3AuthSocialProvider;
  image: React.ReactNode;
}[] = [
  {
    name: "google",
    image: <IconBrandGoogle />,
  },
  {
    name: "twitter",
    image: <IconBrandX />,
  },
  {
    name: "apple",
    image: <IconBrandApple className="fill-white" />,
  },
];

// wallet login options
const walletIcons: { [key: string]: React.ReactNode } = {
  "Brave Wallet": <IconBraveWallet size={28} />,
  "Coinbase Wallet": <IconCoinbaseWallet size={28} />,
  Phantom: <IconPhantomWallet size={28} />,
  Solflare: <IconSolflareWallet size={28} />,
  Backpack: <IconBackpackWallet size={28} />,
  WalletConnect: <IconWalletConnectWallet size={28} />,
  Glow: <IconGlowWallet size={28} />,
  Trust: <IconTrustWallet size={28} />,
  "Ethereum Wallet": <IconEthereum size={28} />,
};

export const WalletAuthDialog = () => {
  const isMobile = useIsMobile();
  const { select, wallets } = useWallet();
  const { connected, loginWeb3Auth } = useWalletContext();

  const { isAndroid, isIOS } = useOs();

  const [isWalletAuthDialogOpen, setIsWalletAuthDialogOpen] = useUiStore((state) => [
    state.isWalletAuthDialogOpen,
    state.setIsWalletAuthDialogOpen,
  ]);

  const [state, setState] = React.useState<WalletAuthDialogState>(
    isMobile ? WalletAuthDialogState.SOCIAL : WalletAuthDialogState.DEFAULT
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isActiveLoading, setIsActiveLoading] = React.useState<string>("");
  const [isMounted, setIsMounted] = React.useState<boolean>(false);

  // installed and available wallets
  const filteredWallets = React.useMemo(() => {
    const filtered = wallets.filter((wallet) => {
      if (wallet.adapter.name === "Mobile Wallet Adapter" && isIOS) return false;
      return wallet.readyState === "Installed" || wallet.readyState === "Loadable";
    });

    // reorder filtered so item with wallet.adapter.name === "Backpack" is first
    const backpackWallet = filtered.find((wallet) => wallet.adapter.name === "Backpack");
    if (backpackWallet) {
      return [backpackWallet, ...filtered.filter((wallet) => wallet.adapter.name !== "Backpack")];
    }

    return filtered;
  }, [wallets, isIOS]);

  // check if phantom is loadable, we will overwrite with a deep link on iOS
  // this improves the PWA UX on iOS by allowing users to open the app directly
  const isPhantomInstalled = React.useMemo(() => {
    return wallets.some((wallet) => {
      return (
        wallet.adapter.name === "Phantom" && (wallet.readyState === "Loadable" || wallet.readyState === "Installed")
      );
    });
  }, [wallets]);

  React.useEffect(() => {
    if (isMobile && state !== WalletAuthDialogState.SOCIAL && !isMounted) {
      setState(WalletAuthDialogState.SOCIAL);
    }
  }, [isMobile, state, isMounted, setIsMounted]);

  React.useEffect(() => {
    if (!isWalletAuthDialogOpen) {
      setIsLoading(false);
      setIsActiveLoading("");
    }
  }, [isWalletAuthDialogOpen]);

  React.useEffect(() => {
    if (connected) {
      setIsWalletAuthDialogOpen(false);
      setIsLoading(false);
      setIsActiveLoading("");
    }
  }, [connected, setIsWalletAuthDialogOpen]);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div>
      <Dialog open={isWalletAuthDialogOpen} onOpenChange={(open) => setIsWalletAuthDialogOpen(open)}>
        <DialogContent
          className={cn(
            "md:block overflow-hidden p-4 pt-8 md:pt-4 justify-start md:max-w-xl",
            filteredWallets.length > 6 && "md:max-w-2xl"
          )}
        >
          <DialogHeader>
            <IconMrgn size={48} />
            <DialogTitle>Sign in to marginfi</DialogTitle>
            <DialogDescription>Earn yield, permissionlessly.</DialogDescription>
          </DialogHeader>

          <div className="w-full space-y-6 mt-8">
            <div
              className={cn(
                "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg h-[105px] overflow-hidden",
                state === WalletAuthDialogState.SOCIAL && "h-[400px]",
                state !== WalletAuthDialogState.SOCIAL && "cursor-pointer hover:bg-muted-highlight"
              )}
              onClick={() => {
                if (state === WalletAuthDialogState.SOCIAL) return;
                setState(WalletAuthDialogState.SOCIAL);
              }}
            >
              <header
                className="cursor-pointer"
                onClick={() => {
                  if (state !== WalletAuthDialogState.SOCIAL) return;
                  setState(WalletAuthDialogState.DEFAULT);
                }}
              >
                <IconChevronDown
                  className={cn(
                    "absolute top-4 right-4 transition-transform cursor-pointer",
                    state === WalletAuthDialogState.SOCIAL && "-rotate-180"
                  )}
                  onClick={() => {
                    if (state !== WalletAuthDialogState.SOCIAL) return;
                    setState(WalletAuthDialogState.DEFAULT);
                  }}
                />

                <h2 className="font-semibold text-2xl text-white">Mobile friendly account</h2>
                <p className="mt-2">Sign in with email & download marginfi&apos;s PWA.</p>
              </header>

              <div className="mt-4">
                <WalletAuthEmailForm
                  loading={isLoading && isActiveLoading === "email"}
                  active={!isLoading || (isLoading && isActiveLoading === "email")}
                  onSubmit={(email) => {
                    setIsLoading(true);
                    setIsActiveLoading("email");
                    loginWeb3Auth("email_passwordless", { login_hint: email });
                  }}
                />

                <div className="mb-4 mt-8 flex items-center justify-center text-sm">
                  <div className="h-[1px] flex-grow bg-input" />
                  <span className="px-6 text-gray-500 dark:text-gray-400">or sign in with</span>
                  <div className="h-[1px] flex-grow bg-input" />
                </div>

                <ul className="flex items-center justify-center gap-4 w-full mt-6 mb-2">
                  {socialProviders.map((provider, i) => (
                    <li key={i}>
                      <WalletAuthButton
                        loading={isLoading && isActiveLoading === provider.name}
                        active={!isLoading || (isLoading && isActiveLoading === provider.name)}
                        name={provider.name}
                        image={provider.image}
                        onClick={() => {
                          setIsLoading(true);
                          setIsActiveLoading(provider.name);
                          loginWeb3Auth(provider.name);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div
              className={cn(
                "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg h-[306px] md:h-[246px] overflow-hidden ",
                state !== WalletAuthDialogState.WALLET &&
                  "h-[150px] md:h-[106px] cursor-pointer hover:bg-muted-highlight"
              )}
              onClick={() => {
                if (state === WalletAuthDialogState.WALLET) return;
                setState(WalletAuthDialogState.WALLET);
              }}
            >
              <header
                className="cursor-pointer"
                onClick={() => {
                  if (state !== WalletAuthDialogState.WALLET) return;
                  setState(WalletAuthDialogState.DEFAULT);
                }}
              >
                <IconChevronDown
                  className={cn(
                    "absolute top-4 right-4 transition-transform cursor-pointer",
                    state === WalletAuthDialogState.WALLET && "-rotate-180"
                  )}
                  onClick={() => {
                    if (state !== WalletAuthDialogState.WALLET) return;
                    setState(WalletAuthDialogState.DEFAULT);
                  }}
                />

                <h2 className="font-semibold text-2xl text-white">Use a wallet</h2>
                <p className="mt-2">
                  If you&apos;re a pro, connect your wallet.
                  {isMobile && " For the best experience we recommend opening marginfi in Phantom or Backpack wallet."}
                </p>
              </header>

              {(filteredWallets.length > 0 || isAndroid || isIOS) && (
                <ul
                  className={cn(
                    "flex flex-wrap items-start justify-center gap-4 mt-6 mb-2 overflow-auto",
                    filteredWallets.length > 6 && "pb-1"
                  )}
                >
                  {filteredWallets.map((wallet, i) => {
                    const img = walletIcons[wallet.adapter.name] || (
                      <Image src={wallet.adapter.icon} width={28} height={28} alt={wallet.adapter.name} />
                    );
                    return (
                      <li key={i} className="space-y-2">
                        <WalletAuthButton
                          name={wallet.adapter.name}
                          image={img}
                          loading={isLoading && isActiveLoading === wallet.adapter.name}
                          active={!isLoading || (isLoading && isActiveLoading === wallet.adapter.name)}
                          onClick={() => {
                            setIsLoading(true);
                            setIsActiveLoading(wallet.adapter.name);
                            select(wallet.adapter.name);
                            setIsWalletAuthDialogOpen(false);
                          }}
                        />
                      </li>
                    );
                  })}
                  {(isAndroid || isIOS) && !isPhantomInstalled && (
                    <li>
                      <WalletAuthButton
                        name="phantom"
                        image={<IconPhantomWallet />}
                        loading={false}
                        active={true}
                        onClick={() => {
                          window.location.href =
                            "https://phantom.app/ul/browse/https://app.marginfi.com?ref=https://app.marginfi.com";
                        }}
                      />
                    </li>
                  )}
                </ul>
              )}
              <div className="flex items-center gap-1 justify-center mt-8 text-sm">
                <IconStarFilled className="text-yellow-400" size={16} /> 5% points boost for{" "}
                <IconBackpackWallet size={16} /> <strong className="text-white font-medium">Backpack</strong> users
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
