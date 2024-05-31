import React from "react";

import { AuthScreenProps, cn } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Button } from "~/components/ui/button";
import { OnboardHeader } from "../sharedComponents";

interface props extends AuthScreenProps {}

export const OnboardingMain = ({ update }: props) => {
  const isMobile = useIsMobile();

  return (
    <div className="pt-8">
      <OnboardHeader
        title={"Welcome to marginfi"}
        description={"Sign in to get started with marginfi. If you're new to crypto, let us guide you the process."}
      />

      <div className="flex lg:flex-row flex-col gap-4 mt-10">
        <div
          className="cursor-pointer relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden"
          onClick={() => update("ONBOARD_SOCIAL")}
        >
          <div className="flex flex-col justify-between h-full gap-6">
            <div className="space-y-3">
              <h2 className="font-semibold text-2xl text-white leading-none">I&apos;m new to crypto</h2>
              <p className="text-sm leading-none sm:text-base">
                Sign up with email or social and we’ll guide you through the process of buying, swapping, and earning
                yield with crypto.
              </p>
            </div>
            <Button className="w-fit hidden lg:block mt-auto" onClick={() => update("ONBOARD_SOCIAL")}>
              Get started
            </Button>
          </div>
        </div>
        <div
          className="cursor-pointer relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden"
          onClick={() => update("ONBOARD_SOL")}
        >
          <div className="flex flex-col justify-between h-full gap-6">
            <div className="space-y-3">
              <h2 className="font-semibold text-2xl text-white leading-none">I&apos;m a Solana user</h2>
              <p className="text-sm leading-none sm:text-base">
                Sign in with email or social to use the marginfi mobile web app, or connect your existing Solana wallet.
              </p>
            </div>
            <Button className="w-fit hidden lg:block mt-auto">Sign in</Button>
          </div>
        </div>
        <div
          className="cursor-pointer relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden lg:cursor-normal"
          onClick={() => update("ONBOARD_ETH")}
        >
          <div className="flex flex-col justify-between h-full gap-6">
            <div className="space-y-3">
              <h2 className="font-semibold text-2xl text-white leading-none">I&apos;m an Ethereum user</h2>
              <p className="text-sm leading-none sm:text-base">
                Sign in with social or connect your wallet and we&apos;ll guide you through bridging, swapping, and
                earning with Solana defi.
              </p>
            </div>
            <Button className="w-fit hidden lg:block mt-auto">Sign in</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
