import React from "react";

import { AuthScreenProps, cn, socialProviders } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Button } from "~/components/ui/button";
import {
  OnboardHeader,
  WalletAuthButton,
  WalletAuthEmailForm,
  WalletAuthWrapper,
  WalletSeperator,
} from "../sharedComponents";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { useAvailableWallets } from "~/hooks/useAvailableWallets";
import { useOs } from "~/hooks/useOs";
import { IconBackpackWallet, IconPhantomWallet, IconStarFilled } from "~/components/ui/icons";
import { useWallet } from "@solana/wallet-adapter-react";

interface props extends AuthScreenProps {}

export const PwaSignIn = ({
  isLoading,
  isActiveLoading,
  setIsActiveLoading,
  setIsLoading,
  loginWeb3Auth,
  update,
  onClose,
}: props) => {
  const isMobile = useIsMobile();
  const wallets = useAvailableWallets();
  const { select, connected } = useWallet();

  const { isAndroid, isIOS } = useOs();

  React.useEffect(() => {
    if (connected) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  return (
    <>
      <OnboardHeader title={"Sign in to marginfi"} description={"Earn yield, permissionlessly."} />

      <div className="flex flex-col gap-4 mt-10 w-full">
        <div className="relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full px-6 py-4 rounded-lg overflow-hidden">
          <div>
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-2xl text-white leading-none">Mobile friendly account</h2>
              <p className="text-sm font-light leading-none sm:text-base">
                Sign in with email to download marginfi&apos;s app directly from the web
              </p>
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
