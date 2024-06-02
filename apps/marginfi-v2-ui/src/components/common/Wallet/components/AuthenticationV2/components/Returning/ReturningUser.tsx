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

export const ReturningUser = ({
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

  // check if phantom is loadable, we will overwrite with a deep link on iOS
  // this improves the PWA UX on iOS by allowing users to open the app directly
  const isPhantomInstalled = React.useMemo(() => {
    return wallets.some((wallet) => {
      return (
        wallet.adapter.name === "Phantom" && (wallet.readyState === "Loadable" || wallet.readyState === "Installed")
      );
    });
  }, [wallets]);

  React.useEffect(() => {
    if (connected) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const onSelectWallet = (selectedWallet: string | null) => {
    if (!selectedWallet) return;
    setIsLoading(true);
    setIsActiveLoading(selectedWallet);
    select(selectedWallet as any);
  };

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
              <h2 className="font-semibold text-2xl text-white leading-none">Mobile friendly account</h2>
              <p>Sign in with email to download marginfi&apos;s mobile app directly from the web.</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-6">
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
              <h2 className="font-semibold text-2xl text-white leading-none">Use a wallet</h2>
              <p>If you're a pro, connect your wallet.</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-6">
            {(filteredWallets.length > 0 || isAndroid || isIOS) && (
              <ul className="flex flex-wrap items-start justify-center gap-4 overflow-auto">
                <WalletAuthWrapper
                  isLoading={isLoading}
                  isActiveLoading={isActiveLoading}
                  wallets={filteredWallets}
                  onClick={(wallet) => {
                    onSelectWallet(wallet.adapter.name);
                  }}
                />
                {(isAndroid || isIOS) && !isPhantomInstalled && (
                  <li>
                    <WalletAuthButton
                      name="phantom"
                      image={<IconPhantomWallet />}
                      loading={false}
                      active={true}
                      onClick={() => {
                        window.location.href =
                          "https://phantom.app/ul/browse/https://app.marginfi.com?ref=https://app.marginfi.com";
                      }}
                    />
                  </li>
                )}
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
