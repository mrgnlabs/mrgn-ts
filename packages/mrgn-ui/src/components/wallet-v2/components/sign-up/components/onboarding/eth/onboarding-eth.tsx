import React from "react";
import Script from "next/script";

import { useOs } from "@mrgnlabs/mrgn-utils";
import { useBrowser } from "@mrgnlabs/mrgn-utils";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ExtendedWallet } from "@mrgnlabs/mrgn-utils";
import {
  AuthScreenProps,
  InstallingWallet,
  OnrampScreenProps,
  SuccessProps,
} from "~/components/wallet-v2/components/sign-up/sign-up.utils";
import { getWalletConnectionMethod } from "~/components/wallet-v2/wallet.utils";
import {
  ethOnrampFlow,
  installWallet,
  successBridge,
} from "~/components/wallet-v2/components/sign-up/components/onboarding/eth/onboarding-eth.utils";

import { OnboardHeader } from "~/components/wallet-v2/components/sign-up/components";

export const OnboardingEth = ({
  mrgnState,
  isLoading,
  flow,
  isActiveLoading,
  setIsLoading,
  setProgress,
  setIsActiveLoading,
  select,
  onClose,
  onPrev,
}: AuthScreenProps) => {
  const { connected, logout } = useWallet();
  const { isPWA, isPhone } = useOs();
  const browser = useBrowser();

  const [screenIndex, setScreenIndex] = React.useState<number>(0);
  const [installingWallet, setInstallingWallet] = React.useState<InstallingWallet>();
  const [successProps, setSuccessProps] = React.useState<SuccessProps>();
  const userHasAcct = React.useMemo(() => mrgnState?.selectedAccount, [mrgnState?.selectedAccount]);

  const screen = React.useMemo(() => {
    if (installingWallet) {
      return installWallet;
    } else if (successProps) {
      return successBridge;
    } else if (ethOnrampFlow.length <= screenIndex) {
      onClose();
    } else if (screenIndex < 0) {
      onPrev();
    }
    // else if (userHasAcct && screenIndex > 0) {
    // onClose();
    // return ethOnrampFlow[0];  }
    else {
      return ethOnrampFlow[screenIndex];
    }
  }, [installingWallet, successProps, screenIndex, userHasAcct]);

  React.useEffect(() => {
    if (connected && screenIndex === 0) {
      setScreenIndex(1);
      localStorage.setItem("isOnboarded", "true");
    }
  }, [connected, screenIndex]);

  React.useEffect(() => {
    const total = ethOnrampFlow.length;

    const percentage = ((screenIndex + 1) / (total + 1)) * 100;
    setProgress(percentage);
  }, [screenIndex]);

  const onSelectWallet = React.useCallback(
    (selectedWallet: ExtendedWallet) => {
      if (!selectedWallet) return;
      //if (installingWallet) setInstallingWallet(undefined);

      const connectionMethod = getWalletConnectionMethod(selectedWallet, { isPWA, isPhone, browser });

      if (connectionMethod === "INSTALL") {
        setInstallingWallet({ flow: "eth", wallet: selectedWallet.adapter.name });
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
        isLoading: isLoading,
        flow: flow,
        isActiveLoading: isActiveLoading,
        mrgnState: mrgnState,
        onNext: () => setScreenIndex(screenIndex + 1),
        setIsLoading: setIsLoading,
        setIsActiveLoading: setIsActiveLoading,
        setInstallingWallet: setInstallingWallet,
        selectWallet: (wallet) => onSelectWallet(wallet),
      } as OnrampScreenProps)}

      <Script src="https://app.debridge.finance/assets/scripts/widget.js" />
    </div>
  );
};
