import { useAvailableWallets } from "~/hooks/useAvailableWallets";
import { useOs } from "~/hooks/useOs";
import { OnrampScreenProps, socialProviders } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";

import {
  ScreenWrapper,
  WalletAuthButton,
  WalletAuthEmailForm,
  WalletAuthWrapper,
  WalletSeperator,
} from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const CreateSocialAccount: React.FC<props> = ({
  isLoading,
  isActiveLoading,
  flow,
  setIsLoading,
  setIsActiveLoading,
  selectWallet,
}: props) => {
  const wallets = useAvailableWallets("pwa");
  const pwaWallets = useAvailableWallets("pwa");
  const { isPWA } = useOs();
  const { loginWeb3Auth } = useWalletContext();

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
      <>
        <WalletSeperator description="or connect with" />
        <ul className="flex flex-wrap items-start justify-center gap-4 overflow-auto">
          <WalletAuthWrapper
            isLoading={isLoading}
            isActiveLoading={isActiveLoading}
            wallets={isPWA ? pwaWallets : wallets}
            onClick={(wallet) => selectWallet(wallet)}
          />
        </ul>
      </>
    </ScreenWrapper>
  );
};
