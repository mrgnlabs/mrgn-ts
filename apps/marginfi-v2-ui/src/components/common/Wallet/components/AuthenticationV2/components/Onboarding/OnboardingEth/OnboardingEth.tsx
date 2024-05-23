import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { DialogContent } from "~/components/ui/dialog";
import { AuthScreenProps, InstallingWallet, OnrampScreenProps, SuccessProps, cn } from "~/utils";

import { OnboardHeader } from "../../sharedComponents";
import { ethOnrampFlow, installWallet, successBridge } from "./onboardingEthUtils";
import Script from "next/script";

interface props extends AuthScreenProps {}

export const OnboardingEth = ({
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
  const [installingWallet, setInstallingWallet] = React.useState<InstallingWallet>();
  const [successProps, setSuccessProps] = React.useState<SuccessProps>();

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
    } else {
      return ethOnrampFlow[screenIndex];
    }
  }, [installingWallet, successProps, screenIndex, onClose, onPrev]);

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
    <DialogContent className={cn("md:block overflow-hidden p-4 pt-8 md:pt-4 justify-start md:max-w-xl")}>
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
    </DialogContent>
  );
};
