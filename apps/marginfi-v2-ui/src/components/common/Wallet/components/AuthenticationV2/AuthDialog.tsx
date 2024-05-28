import React from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";

import { Dialog, DialogContent } from "~/components/ui/dialog";
import { useOs } from "~/hooks/useOs";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useBrowser } from "~/hooks/useBrowser";
import { AUTO_FLOW_MAP, AuthFlowType, AuthScreenProps, cn } from "~/utils";
import { useMrgnlendStore, useUiStore } from "~/store";

export const AuthDialog = () => {
  const [isWalletAuthDialogOpen, setIsWalletAuthDialogOpen] = useUiStore((state) => [
    state.isWalletAuthDialogOpen,
    state.setIsWalletAuthDialogOpen,
  ]);

  const { isAndroid, isIOS, isPWA } = useOs();
  const browser = useBrowser();

  const showPWAInstallScreen = React.useMemo(
    () => (isAndroid || isIOS) && !(isPWA || browser === "Backpack" || browser === "Phantom"),
    [isAndroid, isIOS, browser, isPWA]
  );

  const [flow, setFlow] = React.useState<AuthFlowType>("ONBOARD_MAIN");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isActiveLoading, setIsActiveLoading] = React.useState<string>("");
  const { select, connecting } = useWallet();
  const { loginWeb3Auth } = useWalletContext();
  const { query, replace, pathname } = useRouter();

  // if user has PWA force social login
  React.useEffect(() => {
    if (isPWA) {
      setFlow("ONBOARD_SOCIAL");
    }
  }, [isPWA]);

  // if user is using mobile browser force PWA install screen
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

  // if user is onramping redirect to correct flow
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

  // reset on force close
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
      <DialogContent
        isBgGlass={true}
        onInteractOutside={(e) => e.preventDefault()}
        className={cn(
          "md:block overflow-hidden p-4 pt-8 md:pt-4 justify-start md:max-w-xl",
          flow === "ONBOARD_MAIN" && "lg:max-w-6xl"
        )}
      >
        {React.createElement(AUTO_FLOW_MAP[flow].comp, {
          update: (newScreen) => setFlow(newScreen),
          onClose: () => handleClose(),
          onPrev: () => setFlow("ONBOARD_MAIN"),
          isLoading: isLoading,
          isActiveLoading: isActiveLoading,
          setIsLoading: setIsLoading,
          setIsActiveLoading: setIsActiveLoading,
          loginWeb3Auth: loginWeb3Auth,
        } as AuthScreenProps)}
      </DialogContent>
    </Dialog>
  );
};
