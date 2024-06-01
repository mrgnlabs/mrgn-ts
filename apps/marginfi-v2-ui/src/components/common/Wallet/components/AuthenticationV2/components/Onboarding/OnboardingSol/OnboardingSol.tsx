import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { AuthScreenProps, OnrampScreenProps, SuccessProps, cn } from "~/utils";

import { OnboardHeader } from "../../sharedComponents";
import { solOnrampFlow, successSwap } from "./onboardingSolUtils";

interface props extends AuthScreenProps {}

export const OnboardingSol = ({
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
  const [screenIndex, setScreenIndex] = React.useState<number>(0);
  const [successProps, setSuccessProps] = React.useState<SuccessProps>();

  const screen = React.useMemo(() => {
    if (successProps?.jupiterSuccess && solOnrampFlow[screenIndex].tag === "swap") {
      return successSwap;
    } else if (solOnrampFlow.length <= screenIndex) {
      onClose();
    } else if (screenIndex < 0) {
      onPrev();
    } else {
      return solOnrampFlow[screenIndex];
    }
  }, [onClose, onPrev, screenIndex]);

  React.useEffect(() => {
    if (connected) {
      setIsOnboarded(true);
      setScreenIndex(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const onSelectWallet = (selectedWallet: string | null) => {
    if (!selectedWallet) return;
    setIsLoading(true);
    setIsActiveLoading(selectedWallet);
    select(selectedWallet as any);
  };

  if (!screen) return <></>;

  return (
    <div className="pt-6 font-normal">
      <OnboardHeader
        title={screen.title}
        description={screen.description}
        size={screen.titleSize}
        onPrev={() => setScreenIndex((prev) => prev - 1)}
      />

      {React.createElement(screen.comp, {
        isLoading: isLoading,
        isActiveLoading: isActiveLoading,
        successProps: successProps,
        onNext: () => onClose(),
        setIsLoading: setIsLoading,
        setIsActiveLoading: setIsActiveLoading,
        loginWeb3Auth: loginWeb3Auth,
        setSuccessProps: setSuccessProps,
        select: onSelectWallet,
      } as OnrampScreenProps)}
    </div>
  );
};
