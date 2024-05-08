import Image from "next/image";

import { DialogContent } from "~/components/ui/dialog";
import { AuthScreenProps, socialProviders, walletIcons } from "../../authDialogUitls";
import { cn } from "~/utils";
import { OnboardHeader, WalletAuthButton, WalletAuthEmailForm } from "../sharedComponents";
import { Button } from "~/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import React from "react";
import { WalletSeperator } from "../sharedComponents/WalletSeperator";
import { useOs } from "~/hooks/useOs";
import { IconBackpackWallet, IconPhantomWallet, IconStarFilled } from "~/components/ui/icons";

interface props extends AuthScreenProps {}

export const OnboardingSol = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  loginWeb3Auth,
  select,
}: props) => {
  const { wallets } = useWallet();

  const { isAndroid, isIOS } = useOs();

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

  return (
    <DialogContent className={cn("md:block overflow-hidden p-4 pt-8 md:pt-4 justify-start md:max-w-xl")}>
      <OnboardHeader title={"Welcome to marginfi"} description={"Sign in to lend & earn interest in marginfi."} />

      <div className="w-full space-y-6 mt-8">
        <div
          className={cn(
            "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden max-h-none"
          )}
        >
          <header className="cursor-pointer">
            <h2 className="font-semibold text-2xl text-white">For Solana users</h2>
            <p className="mt-2 text-sm sm:text-base">
              Sign in with email or socials and bridge your funds to marginfi. Or connect your wallet below.
            </p>
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
            <WalletSeperator description="or connect width" />
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
                          //setIsWalletAuthDialogOpen(false);
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
      </div>
    </DialogContent>
  );
};
