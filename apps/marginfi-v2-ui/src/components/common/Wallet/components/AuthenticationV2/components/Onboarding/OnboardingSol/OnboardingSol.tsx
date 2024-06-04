import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { useWalletContext } from "~/hooks/useWalletContext";
import { AuthScreenProps, InstallingWallet, OnrampScreenProps, SuccessProps, cn } from "~/utils";

import { OnboardHeader } from "../../sharedComponents";
import { installWallet, solOnrampFlow, successSwap } from "./onboardingSolUtils";

interface props extends AuthScreenProps {}

export const OnboardingSol = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  onClose,
  onPrev,
}: props) => {
  const { select } = useWallet();
  const { connected, logout } = useWalletContext();

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
  }, [onClose, onPrev, screenIndex, installingWallet]);

  React.useEffect(() => {
    if (connected && screenIndex === 0) {
      setScreenIndex(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, screenIndex]);

  const onSelectWallet = (selectedWallet: string | null) => {
    if (!selectedWallet) return;
    if (installingWallet) setInstallingWallet(undefined);
    setIsLoading(true);
    setIsActiveLoading(selectedWallet);
    select(selectedWallet as any);
  };

  const onPrevScreen = React.useCallback(() => {
    setScreenIndex((prev) => {
      if (prev - 1 === 0 && connected) {
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
        onPrev={() => onPrevScreen()}
      />

      {React.createElement(screen.comp, {
        isLoading: isLoading,
        isActiveLoading: isActiveLoading,
        successProps: successProps,
        onNext: () => onClose(),
        setIsLoading: setIsLoading,
        setIsActiveLoading: setIsActiveLoading,
        setInstallingWallet: setInstallingWallet,
        setSuccessProps: setSuccessProps,
        select: onSelectWallet,
      } as OnrampScreenProps)}
    </div>
  );
};
