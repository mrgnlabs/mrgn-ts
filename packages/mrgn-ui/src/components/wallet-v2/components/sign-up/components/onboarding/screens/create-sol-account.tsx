import React from "react";

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
    </ScreenWrapper>
  );
};
