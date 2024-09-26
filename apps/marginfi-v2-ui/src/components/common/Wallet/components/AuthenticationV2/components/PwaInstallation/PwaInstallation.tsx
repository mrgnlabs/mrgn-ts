import React from "react";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { AuthScreenProps, OnrampScreenProps, cn } from "~/utils";

import { OnboardHeader } from "../sharedComponents";
import { pwaFlow } from "./PwaInstallationUtils";

interface props extends AuthScreenProps {}

export const PwaInstalation = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  update,
  onPrev,
}: props) => {
  const { connected } = useWallet();
  const [screenIndex, setScreenIndex] = React.useState<number>(0);

  const screen = React.useMemo(() => {
    if (screenIndex < 0) {
      onPrev();
      return pwaFlow[0];
    } else {
      return pwaFlow[screenIndex];
    }
  }, [screenIndex, onPrev]);

  React.useEffect(() => {
    if (connected) setScreenIndex(1);
  }, [connected]);

  return (
    <>
      <OnboardHeader title={screen.title} description={screen.description} size={screen.titleSize} />

      {React.createElement(screen.comp, {
        isLoading: isLoading,
        isActiveLoading: isActiveLoading,
        onNext: () => setScreenIndex(screenIndex + 1),
        update: update,
        setIsLoading: setIsLoading,
        setIsActiveLoading: setIsActiveLoading,
      } as OnrampScreenProps)}
    </>
  );
};
