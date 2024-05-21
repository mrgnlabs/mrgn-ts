import React from "react";

import Image from "next/image";

import { IconBackpackWallet, IconPhantomWallet, IconStarFilled } from "~/components/ui/icons";
import { OnrampScreenProps, cn, socialProviders, walletIcons } from "~/utils";
import { useAvailableWallets } from "~/hooks/useAvailableWallets";
import { useOs } from "~/hooks/useOs";

import {
  ScreenWrapper,
  ScreenHeader,
  WalletAuthButton,
  WalletAuthEmailForm,
  WalletSeperator,
  WalletAuthWrapper,
} from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const CreateSolanaAccount: React.FC<props> = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  setInstallingWallet,
  loginWeb3Auth,
  select,
}: props) => {
  const wallets = useAvailableWallets();

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
        <ul className="flex flex-wrap items-start justify-center gap-4 overflow-auto">
          <WalletAuthWrapper
            isLoading={isLoading}
            isActiveLoading={isActiveLoading}
            wallets={filteredWallets}
            onClick={(wallet) => {
              select(wallet.adapter.name);
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
  );
};
