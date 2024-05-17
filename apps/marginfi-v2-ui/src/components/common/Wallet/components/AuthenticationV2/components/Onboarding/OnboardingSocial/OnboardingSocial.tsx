import React from "react";

import { DialogContent } from "~/components/ui/dialog";
import { AuthScreenProps, OnrampScreenProps, cn } from "~/utils";

import { OnboardHeader, WalletAuthButton, WalletAuthEmailForm, WalletSeperator } from "../../sharedComponents";
import { installWallet, socialOnrampFlow, SocialOnrampScreen } from "./onboardingSocialUtils";
import { Wallet, useWallet } from "@solana/wallet-adapter-react";

interface props extends AuthScreenProps {}

export const OnboardingSocial: React.FC<props> = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  loginWeb3Auth,
  onClose,
}: props) => {
  const { select, connected } = useWallet();
  const [screenIndex, setScreenIndex] = React.useState<number>(0);
  const [installingWallet, setInstallingWallet] = React.useState<string>();

  const screen = React.useMemo(() => {
    if (installingWallet) return installWallet;
    else return socialOnrampFlow[screenIndex];
  }, [screenIndex, installingWallet]);

  React.useEffect(() => {
    if (connected) setScreenIndex(1);
  }, [connected]);

  const onSelectWallet = (selectedWallet: string | null) => {
    if (!selectedWallet) return;
    if (installingWallet) setInstallingWallet(undefined);
    setIsLoading(true);
    setIsActiveLoading(selectedWallet);
    select(selectedWallet as any);
  };

  return (
    <DialogContent className={cn("md:block overflow-hidden p-4 pt-8 md:pt-4 justify-start md:max-w-xl")}>
      <OnboardHeader title={screen.title} description={screen.description} size={screen.titleSize} />

      {React.createElement(screen.comp, {
        isLoading: isLoading,
        isActiveLoading: isActiveLoading,
        installingWallet: installingWallet,
        onNext: () => setScreenIndex(screenIndex + 1),
        onClose: onClose,
        setIsLoading: setIsLoading,
        select: (walletName) => onSelectWallet(walletName),
        setIsActiveLoading: setIsActiveLoading,
        setInstallingWallet: setInstallingWallet,
        loginWeb3Auth: loginWeb3Auth,
      } as OnrampScreenProps)}
    </DialogContent>
  );
};
