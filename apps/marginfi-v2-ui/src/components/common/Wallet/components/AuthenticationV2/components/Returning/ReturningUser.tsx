import React from "react";

import { AuthScreenProps, cn, getWalletConnectionMethod, socialProviders } from "~/utils";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ExtendedWallet, useAvailableWallets } from "~/hooks/useAvailableWallets";
import { useOs } from "~/hooks/useOs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { IconBackpackWallet, IconStarFilled } from "~/components/ui/icons";

import {
  OnboardHeader,
  WalletAuthButton,
  WalletAuthEmailForm,
  WalletAuthWrapper,
  WalletSeperator,
} from "../sharedComponents";
import { useBrowser } from "~/hooks/useBrowser";

interface props extends AuthScreenProps {}

export const ReturningUser = ({
  isLoading,
  isActiveLoading,
  setIsActiveLoading,
  setIsLoading,
  select,
  onClose,
}: props) => {
  const wallets = useAvailableWallets();
  const { connected, loginWeb3Auth } = useWallet();
  const { isAndroid, isIOS, isPWA, isPhone } = useOs();
  const browser = useBrowser();

  React.useEffect(() => {
    if (connected) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const onSelectWallet = React.useCallback(
    (selectedWallet: ExtendedWallet) => {
      if (!selectedWallet) return;
      const connectionMethod = getWalletConnectionMethod(selectedWallet, { isPWA, isPhone, browser });

      if (connectionMethod === "INSTALL") {
        window.open(selectedWallet.installLink, "_blank");
      } else if (connectionMethod === "DEEPLINK") {
        window.open(selectedWallet.deeplink);
      } else {
        select(selectedWallet.adapter.name);
      }
    },
    [isPWA, isPhone, browser]
  );

  return (
    <>
      <OnboardHeader title={"Sign in to marginfi"} description={"Earn yield, permissionlessly."} />

      <Accordion className="flex flex-col gap-4 mt-10 w-full" type="single" collapsible>
        <AccordionItem
          className="relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full px-6 py-4 rounded-lg overflow-hidden"
          value="social"
        >
          <AccordionTrigger variant="wallet" className="text-left hover:bg-muted-highlight rounded-lg items-start">
            <div className="flex flex-col gap-3 w-4/5">
              <h2 className="font-medium text-2xl text-white leading-none">Mobile friendly account</h2>
              <p className="font-normal">
                Sign in with email to download marginfi&apos;s mobile app directly from the web.
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-6 mt-4">
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
          </AccordionContent>
        </AccordionItem>
        <AccordionItem
          className="relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full px-6 py-4 rounded-lg overflow-hidden"
          value="wallet"
        >
          <AccordionTrigger
            variant="wallet"
            className={cn("text-left hover:bg-muted-highlight rounded-lg items-start")}
          >
            <div className="flex flex-col gap-3 w-3/4">
              <h2 className="font-medium text-2xl text-white leading-none">Use a wallet</h2>
              <p className="font-normal">If you&apos;re a pro, connect your wallet.</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-6 mt-4">
            {(wallets.length > 0 || isAndroid || isIOS) && (
              <ul className="flex flex-wrap items-start justify-center gap-4 overflow-auto">
                <WalletAuthWrapper
                  isLoading={isLoading}
                  isActiveLoading={isActiveLoading}
                  wallets={wallets}
                  onClick={(wallet) => onSelectWallet(wallet)}
                />
              </ul>
            )}

            <div className="flex items-center gap-1 justify-center text-sm">
              <IconStarFilled className="text-yellow-400" size={16} /> 5% points boost for{" "}
              <IconBackpackWallet size={16} /> <strong className="text-white font-medium">Backpack</strong> users
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
};
