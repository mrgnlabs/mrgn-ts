import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Script from "next/script";

import { DialogContent } from "~/components/ui/dialog";
import { useMrgnlendStore } from "~/store";
import { AuthScreenProps, InstallingWallet, OnrampScreenProps, SuccessProps, cn } from "~/utils";

import { OnboardHeader } from "../../sharedComponents";
import { ethOnrampFlow, installWallet, successBridge } from "./onboardingEthUtils";

interface props extends AuthScreenProps {}

export const OnboardingEth = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setProgress,
  setIsOnboarded,
  setIsActiveLoading,
  loginWeb3Auth,
  onClose,
  onPrev,
}: props) => {
  const [marginfiAccounts] = useMrgnlendStore((state) => [state.marginfiAccounts]);
  const { select, connected } = useWallet();

  const [screenIndex, setScreenIndex] = React.useState<number>(0);
  const [installingWallet, setInstallingWallet] = React.useState<InstallingWallet>();
  const [successProps, setSuccessProps] = React.useState<SuccessProps>();
  const userHasAcct = React.useMemo(() => marginfiAccounts.length > 0, [marginfiAccounts]);

  const screen = React.useMemo(() => {
    if (installingWallet) {
      return installWallet;
    } else if (successProps) {
      return successBridge;
    } else if (ethOnrampFlow.length <= screenIndex) {
      onClose();
      return ethOnrampFlow[0];
    } else if (screenIndex < 0) {
      onPrev();
      return ethOnrampFlow[0];
    } else if (userHasAcct && screenIndex > 0) {
      onClose();
      return ethOnrampFlow[0];
    } else {
      return ethOnrampFlow[screenIndex];
    }
  }, [installingWallet, successProps, screenIndex, userHasAcct]);

  React.useEffect(() => {
    if (connected) {
      setIsOnboarded(true);
      setScreenIndex(1);
    }
  }, [connected]);

  React.useEffect(() => {
    const total = ethOnrampFlow.length;

    const percentage = ((screenIndex + 1) / (total + 1)) * 100;
    setProgress(percentage);
  }, [screenIndex]);

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
        setInstallingWallet: setInstallingWallet,
        select: onSelectWallet,
      } as OnrampScreenProps)}

      <Script src="https://app.debridge.finance/assets/scripts/widget.js" />
    </>
  );
};
