import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { DialogContent } from "~/components/ui/dialog";
import { useMrgnlendStore } from "~/store";
import { AuthScreenProps, InstallingWallet, OnrampScreenProps, SuccessProps, cn } from "~/utils";

import { OnboardHeader } from "../../sharedComponents";
import { installWallet, socialOnrampFlow, successSwap } from "./onboardingSocialUtils";

interface props extends AuthScreenProps {}

export const OnboardingSocial: React.FC<props> = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  loginWeb3Auth,
  onClose,
  onPrev,
}: props) => {
  const { select, connected } = useWallet();
  const [marginfiAccounts] = useMrgnlendStore((state) => [state.marginfiAccounts]);

  const [screenIndex, setScreenIndex] = React.useState<number>(0);
  const [installingWallet, setInstallingWallet] = React.useState<InstallingWallet>();
  const [successProps, setSuccessProps] = React.useState<SuccessProps>();

  const userHasAcct = React.useMemo(() => marginfiAccounts.length > 0, [marginfiAccounts]);

  const screen = React.useMemo(() => {
    if (installingWallet) {
      return installWallet;
    } else if (successProps) {
      return successSwap;
    } else if (socialOnrampFlow.length <= screenIndex) {
      onClose();
      return socialOnrampFlow[0];
    } else if (screenIndex < 0) {
      onPrev();
      return socialOnrampFlow[0];
    } else if (userHasAcct && screenIndex > 0) {
      onClose();
      return socialOnrampFlow[0];
    } else {
      return socialOnrampFlow[screenIndex];
    }
  }, [installingWallet, userHasAcct, successProps, screenIndex, onClose, onPrev]);

  React.useEffect(() => {
    if (connected) setScreenIndex(1);
  }, [connected]);

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
