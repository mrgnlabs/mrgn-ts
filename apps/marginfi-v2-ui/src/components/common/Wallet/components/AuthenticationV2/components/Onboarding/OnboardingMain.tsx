import React from "react";

import { AuthScreenProps, cn } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Button } from "~/components/ui/button";
import { OnboardHeader } from "../sharedComponents";

interface props extends AuthScreenProps {}

export const OnboardingMain = ({ update }: props) => {
  const isMobile = useIsMobile();

  return (
    <div className="pt-8 font-normal overflow-scroll">
      <OnboardHeader
        title={"Welcome to marginfi"}
        description={
          "Sign in to get started with marginfi. If you're new to crypto, we'll guide you through the process below."
        }
      />

      <div className="flex lg:flex-row flex-col gap-6 mt-10">
        <div
          className="cursor-pointer relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg"
          onClick={() => update("ONBOARD_SOCIAL")}
        >
          <div className="flex flex-col justify-between h-full gap-6">
            <div className="space-y-3">
              <h2 className="font-medium text-2xl text-white leading-none">I&apos;m new to crypto</h2>
              <p className="text-sm md:text-base">
                Sign up to earn over-collateralized, transparent, real yield (with no middlemen).
              </p>
            </div>
            <Button className="w-full md:w-fit mt-auto" onClick={() => update("ONBOARD_SOCIAL")}>
              Get started
            </Button>
          </div>
        </div>
        <div
          className="cursor-pointer relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg"
          onClick={() => update("ONBOARD_SOL")}
        >
          <div className="flex flex-col justify-between h-full gap-6">
            <div className="space-y-3">
              <h2 className="font-medium text-2xl text-white leading-none">I&apos;m a Solana user</h2>
              <p className="text-sm md:text-base">
                Sign in to download marginfi&apos;s mobile web app, or connect your existing wallet.
              </p>
            </div>
            <Button className="w-full md:w-fit mt-auto">Sign in</Button>
          </div>
        </div>
        <div
          className="cursor-pointer relative bg-muted hover:bg-muted-highlight text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg lg:cursor-normal"
          onClick={() => update("ONBOARD_ETH")}
        >
          <div className="flex flex-col justify-between h-full gap-6">
            <div className="space-y-3">
              <h2 className="font-medium text-2xl text-white leading-none">I&apos;m an Ethereum user</h2>
              <p className="text-sm md:text-base">
                Sign in to download marginfi&apos;s mobile web app, or connect your wallet. We&apos;ll help you transfer
                funds.
              </p>
            </div>
            <Button className="w-full md:w-fit mt-auto">Sign in</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
