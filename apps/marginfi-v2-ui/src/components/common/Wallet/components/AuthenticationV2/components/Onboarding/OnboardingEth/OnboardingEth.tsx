import { DialogContent } from "~/components/ui/dialog";
import { AuthScreenProps, OnrampScreenProps, cn } from "~/utils";
import { OnboardHeader, WalletAuthButton, WalletAuthEmailForm } from "../../sharedComponents";
import { Button } from "~/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import React from "react";
import { WalletSeperator } from "../../sharedComponents/WalletSeperator";
import { ethOnrampFlow } from "./onboardingEth.utils";

interface props extends AuthScreenProps {}

export const OnboardingEth = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  loginWeb3Auth,
}: props) => {
  const [screenIndex, setScreenIndex] = React.useState<number>(0);

  const screen = React.useMemo(() => ethOnrampFlow[screenIndex], [screenIndex]);

  return (
    <DialogContent className={cn("md:block overflow-hidden p-4 pt-8 md:pt-4 justify-start md:max-w-xl")}>
      <OnboardHeader title={screen.title} description={screen.description} />

      {React.createElement(screen.comp, {
        isLoading: isLoading,
        isActiveLoading: isActiveLoading,
        onNext: () => setScreenIndex(screenIndex + 1),
        setIsLoading: setIsLoading,
        setIsActiveLoading: setIsActiveLoading,
        loginWeb3Auth: loginWeb3Auth,
      } as OnrampScreenProps)}
    </DialogContent>
  );
};
