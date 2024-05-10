import React from "react";

import { DialogContent } from "~/components/ui/dialog";
import { AuthScreenProps, OnrampScreenProps, cn } from "~/utils";

import { OnboardHeader, WalletAuthButton, WalletAuthEmailForm, WalletSeperator } from "../../sharedComponents";
import { socialOnrampFlow, SocialOnrampScreen } from "./onboardingSocialUtils";

interface props extends AuthScreenProps {}

export const OnboardingSocial: React.FC<props> = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  loginWeb3Auth,
}: props) => {
  const [screenIndex, setScreenIndex] = React.useState<number>(0);

  const screen = React.useMemo(() => socialOnrampFlow[screenIndex], [screenIndex]);

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
