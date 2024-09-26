import React from "react";

import { useMrgnlendStore } from "~/store";
import { AuthScreenProps, InstallingWallet, OnrampScreenProps, SuccessProps, getWalletConnectionMethod } from "~/utils";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { Loader } from "~/components/ui/loader";
import { useOs } from "~/hooks/useOs";
import { useBrowser } from "~/hooks/useBrowser";
import { ExtendedWallet } from "~/hooks/useAvailableWallets";

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
  select,
}: props) => {
  const { connected, logout } = useWallet();
  const { isPhone, isPWA } = useOs();
  const browser = useBrowser();

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
      localStorage.setItem("isOnboarded", "true");

      if (userHasAcct) {
        setScreenIndex((prev) => prev++);
      }
    } else if (connected && !userDataFetched && screenIndex === 0) {
      setIsSocialAuthLoading(true);
    }
  }, [userDataFetched, userHasAcct, connected, screenIndex]);

  const onSelectWallet = React.useCallback(
    (selectedWallet: ExtendedWallet) => {
      if (!selectedWallet) return;
      //if (installingWallet) setInstallingWallet(undefined);

      const connectionMethod = getWalletConnectionMethod(selectedWallet, { isPWA, isPhone, browser });

      if (connectionMethod === "INSTALL") {
        setInstallingWallet({ flow: "onramp", wallet: selectedWallet.adapter.name });
        window.open(selectedWallet.installLink, "_blank");
      } else if (connectionMethod === "DEEPLINK") {
        window.open(selectedWallet.deeplink);
      } else {
        select(selectedWallet.adapter.name);
      }
    },
    [isPWA, isPhone, browser]
  );

  const onPrevScreen = React.useCallback(() => {
    if (installingWallet) {
      setInstallingWallet(undefined);
    } else {
      setScreenIndex((prev) => {
        if (prev - 1 == 0 && connected) {
          setIsLoading(false);
          setIsActiveLoading("");
          logout();
          return prev - 2;
        }
        return prev - 1;
      });
    }
  }, [installingWallet, connected]);

  if (!screen) return <></>;

  return (
    <div className="pt-6 font-normal">
      <OnboardHeader
        title={screen.title}
        description={screen.description}
        size={screen.titleSize}
        onPrev={isPhone ? undefined : () => onPrevScreen()}
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
          selectWallet: (wallet) => onSelectWallet(wallet),
          setIsActiveLoading: setIsActiveLoading,
          setInstallingWallet: setInstallingWallet,
          setSuccessProps: setSuccessProps,
        } as OnrampScreenProps)
      )}
    </div>
  );
};
