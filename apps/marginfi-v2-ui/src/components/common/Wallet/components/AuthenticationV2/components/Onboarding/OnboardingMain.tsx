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
        description={"Sign in to get started with marginfi. If you're new to crypto, let us guide you the process."}
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
                Sign up with email or social and we&apos;ll guide you through buying, swapping, and earning yield with
                crypto.
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
                Sign in with email or social to use the marginfi mobile web app, or connect your existing Solana wallet.
              </p>
            </div>
            <Button className="w-full md:w-fit mt-auto">Create account</Button>
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
                Sign in with email or social, or connect your existing wallet and we&apos;ll onboard you to Solana defi.
              </p>
            </div>
            <Button className="w-full md:w-fit mt-auto">Create account</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
