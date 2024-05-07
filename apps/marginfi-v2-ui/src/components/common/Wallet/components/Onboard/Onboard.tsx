import React from "react";
import { NewUserFlow } from "./components";
import { useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Dialog } from "~/components/ui/dialog";

interface OnboardScreenProps {
  update: (screen: React.FC<OnboardScreenProps>) => void;
}

export type AuthFlowType = "ONBOARD" | "RETURNING";

export type AuthFlowMap = {
  [key in AuthFlowType]: {
    comp: React.FC<any>;
  };
};

export const AUTO_FLOW_MAP: AuthFlowMap = {
  ONBOARD: {
    comp: NewUserFlow,
  },
  RETURNING: {
    comp: NewUserFlow,
  },
};

export const Onboard = () => {
  const [flow, setFlow] = React.useState<AuthFlowType>();

  React.useEffect(() => {
    // check if user is new
    setFlow("ONBOARD");
  }, [flow]);

  return (
    <Dialog open={true} onOpenChange={(open) => {}}>
      {/* <NewUserFlow updateScreen={(test) => console.log("hi")} /> */}
      {flow &&
        React.createElement(AUTO_FLOW_MAP[flow].comp, {
          update: (newScreen) => console.log("hi"),
        } as OnboardScreenProps)}
    </Dialog>
  );
};
