import React from "react";

import { cn } from "~/utils";

import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { OnboardHeader } from "../sharedComponents";

import { AuthScreenProps } from "../../authDialogUitls";

interface props extends AuthScreenProps {}

export const OnboardingMain = ({ update }: props) => {
  return (
    <DialogContent className={cn("md:block overflow-hidden p-4 pt-8 md:pt-4 justify-start md:max-w-xl")}>
      <OnboardHeader
        title={"Welcome to marginfi"}
        description={
          "Sign in to get started with marginfi,. If you&apos;re new to crypto, let us guide you the process."
        }
      />

      <div className="w-full space-y-6 mt-8">
        <div
          className={cn(
            "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden"
          )}
        >
          <div>
            <h2 className="font-semibold text-2xl text-white">I&apos;m new to crypto</h2>
            <p className="mt-2 text-sm sm:text-base">Help get up and running</p>
          </div>

          <div className="mt-4">
            <Button variant="default" onClick={() => update("ONBOARD_SOCIAL")}>
              Get started
            </Button>
          </div>
        </div>
        <div
          className={cn(
            "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden cursor-pointer"
          )}
          onClick={() => update("ONBOARD_SOL")}
        >
          <div>
            <h2 className="font-semibold text-2xl text-white">I&apos;m a Solana user</h2>
            <p className="mt-2 text-[15px] sm:text-base">
              Sign in with email or socials to use the marginfi PWA, or connect your wallet
            </p>
          </div>
        </div>
        <div
          className={cn(
            "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden cursor-pointer"
          )}
          onClick={() => update("ONBOARD_ETH")}
        >
          <div>
            <h2 className="font-semibold text-2xl text-white">I&apos;m an Ethereum user</h2>
            <p className="mt-2 text-[15px] sm:text-base">
              Sign in with email or socials and bridge your funds, or connect your eth wallet
            </p>
          </div>
        </div>
      </div>
    </DialogContent>
  );
};
