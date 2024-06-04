import React from "react";

import { AuthScreenProps, socialProviders } from "~/utils";
import { IconBackpackWallet, IconLoader, IconPhantomWallet } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { useBrowser } from "~/hooks/useBrowser";
import { useWalletContext } from "~/hooks/useWalletContext";

import { OnboardHeader, ScreenWrapper, WalletSeperator } from "../sharedComponents";

interface props extends AuthScreenProps {}

export const InAppSignIn = ({ isLoading, select, update, onClose }: props) => {
  const { connected } = useWalletContext();
  const browser = useBrowser();

  const inAppWallet = React.useMemo(() => {
    if (browser === "Phantom") {
      return {
        icon: <IconPhantomWallet />,
        description: "Connect with Phantom",
        connect: () => select("Phantom" as any),
      };
    } else if (browser === "Backpack") {
      return {
        icon: <IconBackpackWallet />,
        description: "Connect with Backpack",
        connect: () => select("Backpack" as any),
      };
    } else {
      return {
        icon: <IconPhantomWallet />,
        description: "Connect with Phantom",
        connect: () => select("Phantom" as any),
      };
    }
  }, [select, browser]);

  React.useEffect(() => {
    if (connected) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  if (!inAppWallet) {
    return <></>;
  }

  return (
    <div className="pt-6 font-normal">
      <OnboardHeader title={"Sign in to marginfi"} description={"Earn yield, permissionlessly."} />
      <ScreenWrapper>
        <div className="flex flex-col items-center justify-center gap-3 text-xl text-primary">
          <span className="rounded-full bg-background-gray-light p-2">{inAppWallet.icon}</span>
          {inAppWallet.description}
        </div>
        <Button disabled={isLoading} onClick={inAppWallet.connect}>
          {isLoading ? <IconLoader /> : "Sign in"}
        </Button>
        <WalletSeperator description={"more sign in options"} onClick={() => update("RETURNING_USER")} />
      </ScreenWrapper>
    </div>
  );
};
