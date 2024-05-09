import React from "react";
import { Dialog } from "~/components/ui/dialog";
import { AUTO_FLOW_MAP, AuthFlowType, AuthScreenProps } from "./authDialogUitls";
import { useWalletContext } from "~/hooks/useWalletContext";

export const AuthDialog = () => {
  const [flow, setFlow] = React.useState<AuthFlowType>();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isActiveLoading, setIsActiveLoading] = React.useState<string>("");
  const { loginWeb3Auth } = useWalletContext();

  React.useEffect(() => {
    // check if user is new
    setFlow("ONBOARD_MAIN");
  }, []);

  return (
    <Dialog open={false} onOpenChange={(open) => {}}>
      {/* <NewUserFlow updateScreen={(test) => console.log("hi")} /> */}
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
