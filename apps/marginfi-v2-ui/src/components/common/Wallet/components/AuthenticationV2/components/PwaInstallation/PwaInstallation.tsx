import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { DialogContent } from "~/components/ui/dialog";
import { AuthScreenProps, OnrampScreenProps, cn } from "~/utils";

import { OnboardHeader } from "../sharedComponents";
import { pwaFlow } from "./PwaInstallationUtils";

interface props extends AuthScreenProps {}

export const PwaInstalation = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  loginWeb3Auth,
  onClose,
  onPrev,
}: props) => {
  const { select, connected } = useWallet();
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

  const onSelectWallet = (selectedWallet: string | null) => {
    if (!selectedWallet) return;
    setIsLoading(true);
    setIsActiveLoading(selectedWallet);
    select(selectedWallet as any);
  };

  return (
    <>
      <OnboardHeader
        title={screen.title}
        description={screen.description}
        size={screen.titleSize}
        onPrev={() => setScreenIndex((prev) => prev - 1)}
      />

      {React.createElement(screen.comp, {
        isLoading: isLoading,
        isActiveLoading: isActiveLoading,
        onNext: () => setScreenIndex(screenIndex + 1),
        setIsLoading: setIsLoading,
        setIsActiveLoading: setIsActiveLoading,
        loginWeb3Auth: loginWeb3Auth,
        select: onSelectWallet,
      } as OnrampScreenProps)}
    </>
  );
};
