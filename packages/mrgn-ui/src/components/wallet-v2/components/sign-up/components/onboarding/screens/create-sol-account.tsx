import React from "react";

import { IconStarFilled } from "@tabler/icons-react";

import { IconBackpackWallet } from "~/components/ui/icons";
import { OnrampScreenProps, socialProviders } from "~/components/wallet-v2/components/sign-up/sign-up.utils";
import { useAvailableWallets } from "@mrgnlabs/mrgn-utils";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { useOs } from "@mrgnlabs/mrgn-utils";

import {
  ScreenWrapper,
  WalletAuthButton,
  WalletAuthEmailForm,
  WalletSeperator,
  WalletAuthWrapper,
} from "~/components/wallet-v2/components/sign-up/components";

interface props extends OnrampScreenProps {}

export const CreateSolanaAccount: React.FC<props> = ({
  isLoading,
  isActiveLoading,
  flow,
  setIsLoading,
  setIsActiveLoading,
  selectWallet,
}: props) => {
  const { loginWeb3Auth } = useWallet();
  const wallets = useAvailableWallets();

  const { isAndroid, isIOS } = useOs();

  return (
    <ScreenWrapper>
      <WalletAuthEmailForm
        loading={isLoading && isActiveLoading === "email"}
        active={!isLoading || (isLoading && isActiveLoading === "email")}
        onSubmit={(email) => {
          setIsLoading(true);
          setIsActiveLoading("email");
          loginWeb3Auth("email_passwordless", { login_hint: email });
          localStorage.setItem("onboardingFlow", flow);
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
                localStorage.setItem("onboardingFlow", flow);
              }}
            />
          </li>
        ))}
      </ul>
      <WalletSeperator description="or connect with" />
      {(wallets.length > 0 || isAndroid || isIOS) && (
        <ul className="flex flex-wrap items-start justify-center gap-4 overflow-auto">
          <WalletAuthWrapper
            isLoading={isLoading}
            isActiveLoading={isActiveLoading}
            wallets={wallets}
            onClick={(wallet) => selectWallet(wallet)}
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
