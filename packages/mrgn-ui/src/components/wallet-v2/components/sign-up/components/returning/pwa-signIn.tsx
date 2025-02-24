import React from "react";

import { AuthScreenProps, socialProviders } from "~/components/wallet-v2/components/sign-up/sign-up.utils";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import {
  OnboardHeader,
  WalletAuthButton,
  WalletAuthEmailForm,
  WalletSeperator,
} from "~/components/wallet-v2/components/sign-up/components";

interface props extends AuthScreenProps {}

export const PwaSignIn = ({ isLoading, isActiveLoading, setIsActiveLoading, setIsLoading, onClose }: props) => {
  const { connected, loginWeb3Auth } = useWallet();

  React.useEffect(() => {
    if (connected) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  return (
    <>
      <OnboardHeader
        title={process.env.NEXT_PUBLIC_APP_ID === "marginfi-v2-ui" ? "Sign in to marginfi" : "Enter The Arena"}
        description={
          process.env.NEXT_PUBLIC_APP_ID === "marginfi-v2-ui"
            ? "Earn yield, permissionlessly."
            : "Memecoin trading, with leverage."
        }
      />

      <div className="flex flex-col gap-4 mt-10 w-full">
        <div className="relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full px-6 py-4 rounded-lg overflow-hidden">
          <div>
            <div className="flex flex-col gap-3">
              <h2 className="font-medium text-2xl text-white leading-none">Mobile friendly account</h2>
              <p className="font-normal">Sign in with email to download marginfi&apos;s app directly from the web</p>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <WalletAuthEmailForm
              loading={isLoading && isActiveLoading === "email"}
              active={!isLoading || (isLoading && isActiveLoading === "email")}
              onSubmit={(email) => {
                setIsLoading(true);
                setIsActiveLoading("email");
                loginWeb3Auth("email_passwordless", { login_hint: email });
              }}
            />
            <WalletSeperator description="or sign in with" />
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
          </div>
        </div>
      </div>
    </>
  );
};
