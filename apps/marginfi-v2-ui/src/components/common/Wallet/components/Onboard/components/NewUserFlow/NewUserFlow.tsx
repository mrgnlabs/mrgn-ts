import React from "react";

import Image from "next/image";
import Link from "next/link";

import { useWallet } from "@solana/wallet-adapter-react";

import { useUiStore } from "~/store";
import { useOs } from "~/hooks/useOs";
import { useIsMobile } from "~/hooks/useIsMobile";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Web3AuthSocialProvider } from "~/hooks/useWalletContext";
import { cn } from "~/utils";

import { WalletAuthButton, WalletAuthEmailForm } from "~/components/common/Wallet";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import {
  IconMrgn,
  IconBrandX,
  IconBrandApple,
  IconBrandGoogle,
  IconBraveWallet,
  IconCoinbaseWallet,
  IconPhantomWallet,
  IconBackpackWallet,
  IconSolflareWallet,
  IconWalletConnectWallet,
  IconGlowWallet,
  IconTrustWallet,
  IconEthereum,
  IconChevronDown,
  IconStarFilled,
} from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { OnboardHeader } from "../sharedComponents";
import * as onboardScreens from "./screens";

interface props {
  update: (value: string) => void;
}

export const NewUserFlow = ({ update }: props) => {
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
            <Button variant="default" onClick={() => update("onboardScreens.OnboardingSocial")}>
              Get started
            </Button>
          </div>
        </div>
        <div
          className={cn(
            "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden "
          )}
          onClick={() => update("onboardScreens.OnboardingSol")}
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
            "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden "
          )}
          onClick={() => update("onboardScreens.OnboardingEth")}
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
