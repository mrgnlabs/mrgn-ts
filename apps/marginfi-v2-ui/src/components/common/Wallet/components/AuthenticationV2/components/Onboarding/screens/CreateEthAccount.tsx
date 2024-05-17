import Image from "next/image";
import { WalletReadyState } from "@solana/wallet-adapter-base";

import { OnrampScreenProps, cn, socialProviders, walletIcons } from "~/utils";

import { WalletAuthButton, WalletAuthEmailForm, WalletSeperator } from "../../sharedComponents";
import { useAvailableWallets, walletInstallMap } from "~/hooks/useAvailableWallets";

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
    <div className="w-full space-y-6 mt-8">
      <div
        className={cn(
          "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden max-h-none"
        )}
      >
        <header className="cursor-pointer">
          <h2 className="font-semibold text-2xl text-white">For Ethereum users</h2>
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
          <WalletSeperator description="or connect with" />
          <ul
            className={cn(
              "flex flex-wrap items-start justify-center gap-4 mt-6 mb-2 overflow-auto",
              wallets.length > 6 && "pb-1"
            )}
          >
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
        </div>
      </div>
    </div>
  );
};
