import React from "react";

import Image from "next/image";

import { useWallet } from "@solana/wallet-adapter-react";

import { useUiStore } from "~/store";
import { useOs } from "~/hooks/useOs";
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
  const { select, wallets } = useWallet();
  const { connected, loginWeb3Auth } = useWalletContext();

  const { isAndroid, isIOS } = useOs();

  const [isWalletAuthDialogOpen, setIsWalletAuthDialogOpen] = useUiStore((state) => [
    state.isWalletAuthDialogOpen,
    state.setIsWalletAuthDialogOpen,
  ]);

  const [state, setState] = React.useState<WalletAuthDialogState>(WalletAuthDialogState.DEFAULT);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isActiveLoading, setIsActiveLoading] = React.useState<string>("");

  // installed and available wallets
  const filteredWallets = React.useMemo(() => {
    return wallets.filter((wallet) => {
      if (wallet.adapter.name === "Mobile Wallet Adapter" && isIOS) return false;
      return wallet.readyState === "Installed" || wallet.readyState === "Loadable";
    });
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

  // alert(`${isAndroid}, ${isIOS}, ${isPhantomInstalled}`);
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

  return (
    <div>
      <Dialog open={isWalletAuthDialogOpen} onOpenChange={(open) => setIsWalletAuthDialogOpen(open)}>
        <DialogContent className="md:block overflow-hidden p-4">
          <DialogHeader>
            <IconMrgn size={48} />
            <DialogTitle>Sign in to marginfi</DialogTitle>
            <DialogDescription>Sign in to lend & earn interest in marginfi.</DialogDescription>
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

                <h2 className="font-semibold text-2xl text-white">Connect with socials</h2>
                <p className="mt-2">Sign in with your email or socials</p>
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
                "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg h-[106px] overflow-hidden",
                state === WalletAuthDialogState.WALLET && "h-[196px]",
                state !== WalletAuthDialogState.WALLET && "cursor-pointer hover:bg-muted-highlight"
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
                <p className="mt-2">If you&apos;re a pro, connect your wallet</p>
              </header>

              {(filteredWallets.length > 0 || isAndroid || isIOS) && (
                <ul className="flex items-center justify-center gap-4 mt-6 mb-2">
                  {filteredWallets.map((wallet, i) => {
                    const img = walletIcons[wallet.adapter.name] || (
                      <Image src={wallet.adapter.icon} width={28} height={28} alt={wallet.adapter.name} />
                    );
                    return (
                      <li key={i}>
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
