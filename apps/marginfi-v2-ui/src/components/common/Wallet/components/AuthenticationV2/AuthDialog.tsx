import React from "react";
import { useRouter } from "next/router";

import { Dialog } from "~/components/ui/dialog";
import { useOs } from "~/hooks/useOs";
import { useWalletContext } from "~/hooks/useWalletContext";
import { AUTO_FLOW_MAP, AuthFlowType, AuthScreenProps } from "~/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { useUiStore } from "~/store";

export const AuthDialog = () => {
  const [isWalletAuthDialogOpen, setIsWalletAuthDialogOpen] = useUiStore((state) => [
    state.isWalletAuthDialogOpen,
    state.setIsWalletAuthDialogOpen,
  ]);

  const { isAndroid, isIOS, isPWA } = useOs();
  const isInAppPhantom = window.localStorage.walletName === "Phantom";
  const isInAppBackpack = window?.backpack?.isBackpack;

  const showPWAInstallScreen = React.useMemo(
    () => (isAndroid || isIOS) && !(isPWA || isInAppBackpack || isInAppPhantom),
    [isAndroid, isIOS, isInAppBackpack, isInAppPhantom, isPWA]
  );

  const [flow, setFlow] = React.useState<AuthFlowType>("ONBOARD_MAIN");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isActiveLoading, setIsActiveLoading] = React.useState<string>("");
  const { select, connecting } = useWallet();
  const { loginWeb3Auth } = useWalletContext();
  const { query, replace, pathname } = useRouter();

  React.useEffect(() => {
    if (showPWAInstallScreen) {
      setFlow("PWA_INSTALL");
    }
  }, [showPWAInstallScreen]);

  React.useEffect(() => {
    if (!connecting) {
      setIsLoading(false);
      setIsActiveLoading("");
    }
  }, [connecting]);

  React.useEffect(() => {
    // check if user is new
    if (query.onramp) {
      const selectedWallet = query.onramp as string;
      const flow = query.flow as string;

      if (flow === "eth") {
        setFlow("ONBOARD_ETH");
      } else {
        setFlow("ONBOARD_SOCIAL");
      }

      setIsLoading(true);
      setIsActiveLoading(selectedWallet);
      select(selectedWallet as any);

      const newQuery = { ...query };
      delete newQuery.onramp;
      delete newQuery.flow;
      replace(
        {
          pathname: pathname,
          query: newQuery,
        },
        undefined,
        { shallow: true }
      );
    }
  }, [pathname, query, query.onramp, replace, select]);

  React.useEffect(() => {
    if (!isWalletAuthDialogOpen) {
      setIsLoading(false);
      setIsActiveLoading("");
      setFlow("ONBOARD_MAIN");
    }
  }, [isWalletAuthDialogOpen]);

  const handleClose = () => {
    setIsLoading(false);
    setIsActiveLoading("");
    setFlow("ONBOARD_MAIN");
    setIsWalletAuthDialogOpen(false);
  };

  return (
    <Dialog
      open={isWalletAuthDialogOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
        else setIsWalletAuthDialogOpen(open);
      }}
    >
      {flow &&
        React.createElement(AUTO_FLOW_MAP[flow].comp, {
          update: (newScreen) => setFlow(newScreen),
          onClose: () => handleClose(),
          onPrev: () => setFlow("ONBOARD_MAIN"),
          isLoading: isLoading,
          isActiveLoading: isActiveLoading,
          setIsLoading: setIsLoading,
          setIsActiveLoading: setIsActiveLoading,
          loginWeb3Auth: loginWeb3Auth,
        } as AuthScreenProps)}
    </Dialog>
  );
};
