import Image from "next/image";
import { WalletReadyState } from "@solana/wallet-adapter-base";

import { OnrampScreenProps, cn, socialProviders, walletIcons } from "~/utils";
import { useAvailableWallets, walletInstallMap } from "~/hooks/useAvailableWallets";

import {
  ScreenWrapper,
  ScreenHeader,
  WalletAuthButton,
  WalletAuthEmailForm,
  WalletSeperator,
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
      <ScreenHeader
        title="For Ethereum users"
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
      <ul className={cn("flex flex-wrap items-start justify-center gap-4 overflow-auto", wallets.length > 6 && "pb-1")}>
        {wallets.map((wallet, i) => {
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
                  if (wallet.readyState !== WalletReadyState.Installed) {
                    setInstallingWallet(wallet.adapter.name);
                    window.open(walletInstallMap[wallet.adapter.name], "_blank");
                  } else {
                    select(wallet.adapter.name);
                  }
                }}
              />
            </li>
          );
        })}
      </ul>
    </ScreenWrapper>
  );
};
