import React from "react";
import Image from "next/image";
import { Wallet, useWallet } from "@solana/wallet-adapter-react";

import { useOs } from "~/hooks/useOs";
import { IconBackpackWallet, IconPhantomWallet, IconStarFilled } from "~/components/ui/icons";
import { useUiStore } from "~/store";
import { DialogContent } from "~/components/ui/dialog";
import { AuthScreenProps, cn, socialProviders, walletIcons } from "~/utils";

import {
  OnboardHeader,
  ScreenHeader,
  ScreenWrapper,
  WalletAuthButton,
  WalletAuthEmailForm,
  WalletSeperator,
  WalletAuthWrapper,
} from "../sharedComponents";

interface props extends AuthScreenProps {}

export const OnboardingSol = ({
  isLoading,
  isActiveLoading,
  update,
  setIsLoading,
  setIsActiveLoading,
  loginWeb3Auth,
}: props) => {
  const { select, connected } = useWallet();
  const [isWalletAuthDialogOpen, setIsWalletAuthDialogOpen] = useUiStore((state) => [
    state.isWalletAuthDialogOpen,
    state.setIsWalletAuthDialogOpen,
  ]);
  const { wallets } = useWallet();

  const onSelectWallet = (selectedWallet: string | null) => {
    if (!selectedWallet) return;
    setIsLoading(true);
    setIsActiveLoading(selectedWallet);
    select(selectedWallet as any);
  };

  React.useEffect(() => {
    if (connected) {
      update("ONBOARD_MAIN");
      setIsWalletAuthDialogOpen(false);
    }
  }, [connected, setIsWalletAuthDialogOpen, update]);

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
    <DialogContent>
      <OnboardHeader title={"Welcome to marginfi"} description={"Sign in to lend & earn interest in marginfi."} />
      <ScreenWrapper>
        <ScreenHeader
          title="For Solana users"
          description="Sign in with email or socials and bridge your funds to marginfi. Or connect your wallet below."
        />
        <WalletAuthEmailForm
          loading={isLoading && isActiveLoading === "email"}
          active={!isLoading || (isLoading && isActiveLoading === "email")}
          onSubmit={(email) => {
            setIsLoading(true);
            setIsActiveLoading("email");
            loginWeb3Auth("email_passwordless", { login_hint: email });
          }}
        />
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
                  loginWeb3Auth(provider.name);
                }}
              />
            </li>
          ))}
        </ul>
        <WalletSeperator description="or connect with" />
        {(filteredWallets.length > 0 || isAndroid || isIOS) && (
          <ul
            className={cn(
              "flex flex-wrap items-start justify-center gap-4 overflow-auto",
              filteredWallets.length > 6 && "pb-1"
            )}
          >
            <WalletAuthWrapper
              isLoading={isLoading}
              isActiveLoading={isActiveLoading}
              wallets={filteredWallets}
              onClick={(wallet) => {
                setIsLoading(true);
                setIsActiveLoading(wallet.adapter.name);
                onSelectWallet(wallet.adapter.name);
              }}
            />
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
        <div className="flex items-center gap-1 justify-center text-sm">
          <IconStarFilled className="text-yellow-400" size={16} /> 5% points boost for <IconBackpackWallet size={16} />{" "}
          <strong className="text-white font-medium">Backpack</strong> users
        </div>
      </ScreenWrapper>
    </DialogContent>
  );
};
