import React from "react";
import { NewUserFlow } from "./components";
import { useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Dialog } from "~/components/ui/dialog";

export interface OnboardScreenProps {
  updateScreen: (screen: React.FC<OnboardScreenProps>) => void;
}

export const Onboard = () => {
  const [screen, setScreen] = React.useState<React.FC<OnboardScreenProps>>();

  React.useEffect(() => {
    // check if user is new
    setScreen(NewUserFlow);
  }, [screen]);

  return (
    <Dialog open={true} onOpenChange={(open) => {}}>
      <NewUserFlow updateScreen={(test) => console.log("hi")} />
      {/* {screen &&
        React.createElement(screen, { updateScreen: (newScreen) => setScreen(newScreen) } as OnboardScreenProps)} */}
    </Dialog>
  );
};
