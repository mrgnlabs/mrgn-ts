import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { useMrgnlendStore } from "~/store";
import { AuthScreenProps, InstallingWallet, OnrampScreenProps, SuccessProps, cn } from "~/utils";

import { OnboardHeader } from "../../sharedComponents";
import { alreadyOnboarded, installWallet, socialOnrampFlow, successSwap } from "./onboardingSocialUtils";

interface props extends AuthScreenProps {}

export const OnboardingSocial: React.FC<props> = ({
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
  const { select, connected } = useWallet();
  const [userDataFetched, marginfiAccounts] = useMrgnlendStore((state) => [
    state.userDataFetched,
    state.marginfiAccounts,
  ]);

  const [screenIndex, setScreenIndex] = React.useState<number>(0);
  const [installingWallet, setInstallingWallet] = React.useState<InstallingWallet>();
  const [successProps, setSuccessProps] = React.useState<SuccessProps>();

  const userHasAcct = React.useMemo(
    () => userDataFetched && marginfiAccounts.length > 0,
    [marginfiAccounts, userDataFetched]
  );

  const screen = React.useMemo(() => {
    if (installingWallet) {
      return installWallet;
    } else if (successProps?.jupiterSuccess && socialOnrampFlow[screenIndex].tag === "swap") {
      return successSwap;
    } else if (socialOnrampFlow.length <= screenIndex) {
      onClose();
      return socialOnrampFlow[0];
    } else if (screenIndex < 0) {
      onPrev();
      return socialOnrampFlow[0];
    } else if (userHasAcct && screenIndex == 0) {
      return alreadyOnboarded;
    } else {
      return socialOnrampFlow[screenIndex];
    }
  }, [installingWallet, userHasAcct, successProps, screenIndex]);

  React.useEffect(() => {
    const total = socialOnrampFlow.length;

    const percentage = ((screenIndex + 1) / (total + 1)) * 100;
    setProgress(percentage);
  }, [screenIndex]);

  React.useEffect(() => {
    if (connected && userDataFetched) {
      setIsActiveLoading("");
      setIsLoading(false);
      setIsOnboarded(true);

      if (userHasAcct) {
        setScreenIndex((prev) => prev++);
      }
    }
  }, [userDataFetched, userHasAcct, connected]);

  const onSelectWallet = (selectedWallet: string | null) => {
    if (!selectedWallet) return;
    if (installingWallet) setInstallingWallet(undefined);
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
        installingWallet: installingWallet,
        successProps: successProps,
        onNext: () => setScreenIndex(screenIndex + 1),
        onClose: onClose,
        setIsLoading: setIsLoading,
        select: (walletName) => onSelectWallet(walletName),
        setIsActiveLoading: setIsActiveLoading,
        setInstallingWallet: setInstallingWallet,
        setSuccessProps: setSuccessProps,
        loginWeb3Auth: loginWeb3Auth,
      } as OnrampScreenProps)}
    </>
  );
};
