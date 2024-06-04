import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { useMrgnlendStore } from "~/store";
import { AuthScreenProps, InstallingWallet, OnrampScreenProps, SuccessProps } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Loader } from "~/components/ui/loader";
import { useOs } from "~/hooks/useOs";

import { OnboardHeader } from "../../sharedComponents";
import { alreadyOnboarded, installWallet, socialOnrampFlow, successOnramp, successSwap } from "./onboardingSocialUtils";

interface props extends AuthScreenProps {}

export const OnboardingSocial: React.FC<props> = ({
  flow,
  isLoading,
  isActiveLoading,
  setIsLoading,
  setProgress,
  setIsActiveLoading,
  onClose,
  onPrev,
}: props) => {
  const { select } = useWallet();
  const { connected, logout } = useWalletContext();
  const { isAndroid, isIOS, isPWA } = useOs();

  const isMobile = React.useMemo(() => {
    if (isAndroid || isIOS || isPWA) return true;
    else return false;
  }, [isAndroid, isIOS, isPWA]);

  const [userDataFetched, marginfiAccounts] = useMrgnlendStore((state) => [
    state.userDataFetched,
    state.marginfiAccounts,
  ]);
  const [screenIndex, setScreenIndex] = React.useState<number>(0);
  const [installingWallet, setInstallingWallet] = React.useState<InstallingWallet>();
  const [successProps, setSuccessProps] = React.useState<SuccessProps>();
  const [isSocialAuthLoading, setIsSocialAuthLoading] = React.useState<boolean>(false);

  const userHasAcct = React.useMemo(
    () => userDataFetched && marginfiAccounts.length > 0,
    [marginfiAccounts, userDataFetched]
  );

  const screen = React.useMemo(() => {
    if (installingWallet) {
      return installWallet;
    } else if (successProps?.jupiterSuccess && socialOnrampFlow[screenIndex].tag === "swap") {
      return successSwap;
    } else if (successProps?.mesoSuccess && socialOnrampFlow[screenIndex].tag === "onramp") {
      return successOnramp;
    } else if (socialOnrampFlow.length <= screenIndex) {
      onClose();
    } else if (screenIndex < 0) {
      onPrev();
    } else if (userHasAcct && screenIndex == 0) {
      console.log({ userHasAcct });
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
    if (connected && userDataFetched && screenIndex === 0) {
      setIsActiveLoading("");
      setIsLoading(false);
      setIsSocialAuthLoading(false);
      setScreenIndex(1);

      if (userHasAcct) {
        setScreenIndex((prev) => prev++);
      }
    } else if (connected && !userDataFetched && screenIndex === 0) {
      setIsSocialAuthLoading(true);
    }
  }, [userDataFetched, userHasAcct, connected, screenIndex]);

  const onSelectWallet = (selectedWallet: string | null) => {
    if (!selectedWallet) return;
    if (installingWallet) setInstallingWallet(undefined);
    setIsLoading(true);
    setIsActiveLoading(selectedWallet);
    select(selectedWallet as any);
  };

  const onPrevScreen = React.useCallback(() => {
    setScreenIndex((prev) => {
      if (prev - 1 == 0 && connected) {
        setIsLoading(false);
        setIsActiveLoading("");
        logout();
        return prev - 2;
      }
      return prev - 1;
    });
  }, [connected]);

  if (!screen) return <></>;

  return (
    <div className="pt-6 font-normal">
      <OnboardHeader
        title={screen.title}
        description={screen.description}
        size={screen.titleSize}
        onPrev={isMobile ? undefined : () => onPrevScreen()}
      />

      {isSocialAuthLoading ? (
        <Loader />
      ) : (
        React.createElement(screen.comp, {
          isLoading: isLoading,
          isActiveLoading: isActiveLoading,
          installingWallet: installingWallet,
          successProps: successProps,
          flow: flow,
          onNext: () => setScreenIndex(screenIndex + 1),
          onClose: onClose,
          setIsLoading: setIsLoading,
          select: (walletName) => onSelectWallet(walletName),
          setIsActiveLoading: setIsActiveLoading,
          setInstallingWallet: setInstallingWallet,
          setSuccessProps: setSuccessProps,
        } as OnrampScreenProps)
      )}
    </div>
  );
};
