import React from "react";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { useOs } from "~/hooks/useOs";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWalletStore } from "~/store";
import { Web3AuthSocialProvider, useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { WalletAuthButton, WalletAuthEmailForm } from "~/components/common/Wallet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import {
  IconMrgn,
  IconBrandX,
  IconBrandApple,
  IconBrandGoogleFilled,
  IconBraveWallet,
  IconPhantomWallet,
  IconBackpackWallet,
  IconSolflareWallet,
  IconWalletConnectWallet,
  IconGlowWallet,
} from "~/components/ui/icons";

const socialProviders: {
  name: Web3AuthSocialProvider;
  image: React.ReactNode;
}[] = [
  {
    name: "google",
    image: <IconBrandGoogleFilled />,
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

const walletIcons: { [key: string]: React.ReactNode } = {
  "Brave Wallet": <IconBraveWallet />,
  Phantom: <IconPhantomWallet />,
  Solflare: <IconSolflareWallet />,
  Backpack: <IconBackpackWallet />,
  WalletConnect: <IconWalletConnectWallet />,
  Glow: <IconGlowWallet />,
};

export const WalletAuthDialog = () => {
  const { select, wallets } = useWallet();
  const { connected, login } = useWalletContext();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isActiveLoading, setIsActiveLoading] = React.useState<string>("");
  const { isAndroid, isIOS } = useOs();

  const [isWalletAuthDialogOpen, setIsWalletAuthDialogOpen] = useWalletStore((state) => [
    state.isWalletAuthDialogOpen,
    state.setIsWalletAuthDialogOpen,
  ]);

  const filteredWallets = React.useMemo(() => {
    return wallets.filter((wallet) => {
      if (wallet.adapter.name === "Mobile Wallet Adapter" && isIOS) return false;
      return wallet.readyState === "Installed" || wallet.readyState === "Loadable";
    });
  }, [wallets]);

  const isPhantomInstalled = React.useMemo(() => {
    return wallets.some((wallet) => wallet.adapter.name === "Phantom" && wallet.readyState === "Loadable");
  }, [wallets]);

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
  }, [connected]);

  return (
    <div>
      <Dialog open={isWalletAuthDialogOpen} onOpenChange={(open) => setIsWalletAuthDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <IconMrgn size={48} />
            <DialogTitle>Sign in to marginfi</DialogTitle>
            <DialogDescription>
              Sign in with your email or socials to lend & earn interest in marginfi.
              <br className="hidden lg:block" /> If you&apos;re a pro, connect your existing wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="w-full md:w-4/5 mx-auto">
            <WalletAuthEmailForm
              loading={isLoading && isActiveLoading === "email"}
              active={!isLoading || (isLoading && isActiveLoading === "email")}
              onSubmit={(email) => {
                setIsLoading(true);
                setIsActiveLoading("email");
                login("email_passwordless", { login_hint: email });
              }}
            />

            <div className="mb-4 mt-8 flex items-center justify-center text-sm">
              <hr className="flex-grow border-gray-300 dark:border-gray-700" />
              <span className="px-2 text-gray-500 dark:text-gray-400">or sign in with</span>
              <hr className="flex-grow border-gray-300 dark:border-gray-700" />
            </div>

            <ul className="flex items-center justify-center gap-4 w-full">
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
                      login(provider.name);
                    }}
                  />
                </li>
              ))}
            </ul>

            {(filteredWallets.length > 0 || isAndroid || isIOS) && (
              <>
                <div className="mb-4 mt-8 flex items-center justify-center text-sm">
                  <hr className="flex-grow border-gray-300 dark:border-gray-700" />
                  <span className="px-2 text-gray-500 dark:text-gray-400">or connect wallet</span>
                  <hr className="flex-grow border-gray-300 dark:border-gray-700" />
                </div>
                <ul className="flex items-center justify-center gap-4">
                  {filteredWallets.map((wallet, i) => {
                    const img = walletIcons[wallet.adapter.name] || (
                      <Image src={wallet.adapter.icon} width={24} height={24} alt={wallet.adapter.name} />
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
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
