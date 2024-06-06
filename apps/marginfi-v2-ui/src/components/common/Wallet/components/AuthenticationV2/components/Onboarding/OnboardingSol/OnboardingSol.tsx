import React from "react";

import { useWalletContext } from "~/hooks/useWalletContext";
import { AuthScreenProps, InstallingWallet, OnrampScreenProps, SuccessProps, getWalletConnectionMethod } from "~/utils";
import { useOs } from "~/hooks/useOs";
import { useBrowser } from "~/hooks/useBrowser";
import { ExtendedWallet } from "~/hooks/useAvailableWallets";

import { OnboardHeader } from "../../sharedComponents";
import { installWallet, solOnrampFlow, successSwap } from "./onboardingSolUtils";

interface props extends AuthScreenProps {}

export const OnboardingSol = ({
  flow,
  isLoading,
  isActiveLoading,
  select,
  setIsLoading,
  setIsActiveLoading,
  onClose,
  onPrev,
}: props) => {
  const { connected, logout } = useWalletContext();
  const { isPhone, isPWA } = useOs();
  const browser = useBrowser();

  const [installingWallet, setInstallingWallet] = React.useState<InstallingWallet>();
  const [screenIndex, setScreenIndex] = React.useState<number>(0);
  const [successProps, setSuccessProps] = React.useState<SuccessProps>();

  const screen = React.useMemo(() => {
    if (installingWallet) {
      return installWallet;
    } else if (successProps?.jupiterSuccess && solOnrampFlow[screenIndex].tag === "swap") {
      return successSwap;
    } else if (solOnrampFlow.length <= screenIndex) {
      onClose();
    } else if (screenIndex < 0) {
      onPrev();
    } else {
      return solOnrampFlow[screenIndex];
    }
  }, [installingWallet, successProps, screenIndex]);

  React.useEffect(() => {
    if (connected && screenIndex === 0) {
      setScreenIndex(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, screenIndex]);

  const onSelectWallet = React.useCallback(
    (selectedWallet: ExtendedWallet) => {
      if (!selectedWallet) return;
      //if (installingWallet) setInstallingWallet(undefined);

      const connectionMethod = getWalletConnectionMethod(selectedWallet, { isPWA, isPhone, browser });

      if (connectionMethod === "INSTALL") {
        setInstallingWallet({ flow: "sol", wallet: selectedWallet.adapter.name });
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
        onPrev={() => onPrevScreen()}
      />

      {React.createElement(screen.comp, {
        flow: flow,
        isLoading: isLoading,
        isActiveLoading: isActiveLoading,
        successProps: successProps,
        installingWallet: installingWallet,
        onNext: () => setScreenIndex(screenIndex + 1),
        setIsLoading: setIsLoading,
        setIsActiveLoading: setIsActiveLoading,
        setInstallingWallet: setInstallingWallet,
        setSuccessProps: setSuccessProps,
        selectWallet: (wallet) => onSelectWallet(wallet),
      } as OnrampScreenProps)}
    </div>
  );
};
