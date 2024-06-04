import React from "react";

import { IconBackpackWallet, IconStarFilled } from "~/components/ui/icons";
import { OnrampScreenProps, socialProviders } from "~/utils";
import { useAvailableWallets } from "~/hooks/useAvailableWallets";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useOs } from "~/hooks/useOs";

import {
  ScreenWrapper,
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
  select,
}: props) => {
  const { loginWeb3Auth } = useWalletContext();
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

  return (
    <ScreenWrapper>
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
              if (wallet.installLink) {
                setInstallingWallet({ flow: "onramp", wallet: wallet.adapter.name });
                window.open(wallet.installLink, "_blank");
              } else if (wallet.deeplink) {
                window.open(wallet.deeplink);
              } else {
                select(wallet.adapter.name);
              }
            }}
          />
        </ul>
      )}
      <div className="flex items-center gap-1 justify-center text-sm">
        <IconStarFilled className="text-yellow-400" size={16} /> 5% points boost for <IconBackpackWallet size={16} />{" "}
        <strong className="text-white font-medium">Backpack</strong> users
      </div>
    </ScreenWrapper>
  );
};
