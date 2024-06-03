import { WalletReadyState } from "@solana/wallet-adapter-base";

import { OnrampScreenProps, socialProviders } from "~/utils";
import { useAvailableWallets, walletInstallMap } from "~/hooks/useAvailableWallets";

import {
  ScreenWrapper,
  WalletAuthButton,
  WalletAuthEmailForm,
  WalletSeperator,
  WalletAuthWrapper,
} from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const CreateEthAccount: React.FC<props> = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  setInstallingWallet,
  loginWeb3Auth,
  select,
}: props) => {
  const wallets = useAvailableWallets("eth");
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
      <ul className="flex flex-wrap items-start justify-center gap-4 overflow-auto">
        <WalletAuthWrapper
          isLoading={isLoading}
          isActiveLoading={isActiveLoading}
          wallets={wallets}
          onClick={(wallet) => {
            if (wallet.installLink) {
              setInstallingWallet({ flow: "eth", wallet: wallet.adapter.name });
              window.open(wallet.installLink, "_blank");
            } else if (wallet.deeplink) {
              window.open(wallet.deeplink);
            } else {
              select(wallet.adapter.name);
            }
          }}
        />
      </ul>
    </ScreenWrapper>
  );
};
