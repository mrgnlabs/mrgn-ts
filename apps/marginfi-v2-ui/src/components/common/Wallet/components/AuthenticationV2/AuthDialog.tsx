import React from "react";
import { useRouter } from "next/router";

import { Dialog } from "~/components/ui/dialog";
import { useWalletContext } from "~/hooks/useWalletContext";
import { AUTO_FLOW_MAP, AuthFlowType, AuthScreenProps } from "~/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { useUiStore } from "~/store";

export const AuthDialog = () => {
  const [isWalletAuthDialogOpen, setIsWalletAuthDialogOpen] = useUiStore((state) => [
    state.isWalletAuthDialogOpen,
    state.setIsWalletAuthDialogOpen,
  ]);

  const [flow, setFlow] = React.useState<AuthFlowType>();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isActiveLoading, setIsActiveLoading] = React.useState<string>("");
  const { select } = useWallet();
  const { loginWeb3Auth } = useWalletContext();
  const { query } = useRouter();

  React.useEffect(() => {
    // check if user is new
    if (query.onramp) {
      const selectedWallet = query.onramp as string;
      setFlow("ONBOARD_SOCIAL");
      setIsLoading(true);
      setIsActiveLoading(selectedWallet);
      select(selectedWallet as any);
    } else {
      setFlow("ONBOARD_MAIN");
    }
  }, [query.onramp, select]);

  React.useEffect(() => {
    if (!isWalletAuthDialogOpen) {
      setIsLoading(false);
      setIsActiveLoading("");
    }
  }, [isWalletAuthDialogOpen]);

  return (
    <Dialog open={isWalletAuthDialogOpen} onOpenChange={(open) => setIsWalletAuthDialogOpen(open)}>
      {flow &&
        React.createElement(AUTO_FLOW_MAP[flow].comp, {
          update: (newScreen) => setFlow(newScreen),
          isLoading: isLoading,
          isActiveLoading: isActiveLoading,
          setIsLoading: setIsLoading,
          setIsActiveLoading: setIsActiveLoading,
          loginWeb3Auth: loginWeb3Auth,
        } as AuthScreenProps)}
    </Dialog>
  );
};
