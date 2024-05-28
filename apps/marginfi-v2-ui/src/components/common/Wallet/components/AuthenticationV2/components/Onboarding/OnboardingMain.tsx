import React from "react";

import { AuthScreenProps, cn } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { DialogContent } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { OnboardHeader } from "../sharedComponents";

interface props extends AuthScreenProps {}

export const OnboardingMain = ({ update }: props) => {
  const isMobile = useIsMobile();

  return (
    <DialogContent className="md:block overflow-hidden p-4 pt-8 md:pt-4 justify-start md:max-w-xl lg:max-w-6xl">
      <OnboardHeader
        title={"Welcome to marginfi"}
        description={"Sign in to get started with marginfi. If you're new to crypto, let us guide you the process."}
      />

      <div className="flex lg:flex-row flex-col gap-4 mt-10">
        <div
          className="relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden cursor-pointer lg:cursor-normal"
          onClick={() => isMobile && update("ONBOARD_SOCIAL")}
        >
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-2xl text-white leading-none">I&apos;m new to crypto</h2>
            <p className="text-sm leading-none sm:text-base">
              Sign up with email or social and we'll guide through the process of buying, swapping, and earning yield
              with crypto.
            </p>
            <Button className="w-fit hidden lg:block" onClick={() => update("ONBOARD_SOCIAL")}>
              Get started
            </Button>
          </div>
        </div>
        <div
          className="relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden cursor-pointer"
          onClick={() => isMobile && update("ONBOARD_SOL")}
        >
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-2xl text-white leading-none">I&apos;m a Solana user</h2>
            <p className="text-sm leading-none sm:text-base">
              Sign in with email or socials to use the marginfi mobile web app, or connect your existing Solana wallet.
            </p>
            <Button className="w-fit hidden lg:block" onClick={() => isMobile && update("ONBOARD_SOL")}>
              Sign in
            </Button>
          </div>
        </div>
        <div
          className="relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden cursor-pointer"
          onClick={() => isMobile && update("ONBOARD_ETH")}
        >
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-2xl text-white leading-none">I&apos;m an Ethereum user</h2>
            <p className="text-sm leading-none sm:text-base">
              Sign in with email, social, or connect your wallet. Bridge your funds, swap tokens, and start earning with
              Solana defi.
            </p>
            <Button className="w-fit hidden lg:block" onClick={() => update("ONBOARD_ETH")}>
              Sign in
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
};
