import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";

import { useIsMobile } from "~/hooks/useIsMobile";
import { ActionBox } from "~/components/common/ActionBox";
import { Dialog, DialogTrigger, DialogOverlay, DialogContent, DialogClose } from "~/components/ui/dialog";
import { Desktop, Mobile } from "~/mediaQueries";
import { IconArrowLeft } from "~/components/ui/icons";
import { useMrgnlendStore } from "~/store";
import { TradingBoxSettings } from "./TradingBoxSettings";

type SettingsDialogProps = {
  slippageBps: number;
  setSlippageBps: (value: number) => void;

  children: React.ReactNode;
  isDialogTriggered?: boolean;
};

export const TradingBoxSettingsDialog = ({
  slippageBps,
  setSlippageBps,
  children,
  isDialogTriggered = false,
}: SettingsDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    setIsDialogOpen(isDialogTriggered);
  }, [setIsDialogOpen, isDialogTriggered]);

  return (
    <Dialog open={isDialogOpen} modal={!isMobile} onOpenChange={(open) => setIsDialogOpen(open)}>
      <Mobile>
        {isDialogOpen && <div className="fixed inset-0 h-screen z-40 md:z-50 bg-background md:bg-background/80" />}
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          hideClose={true}
          className="mt-20 justify-start flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl bg-background-gray border-none z-40 md:z-50"
        >
          <TradingBoxSettings
            toggleSettings={(mode) => setIsDialogOpen(mode)}
            slippageBps={slippageBps}
            setSlippageBps={setSlippageBps}
          />
        </DialogContent>
      </Mobile>
      <Desktop>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          className="md:flex md:max-w-[520px] md:py-3 md:px-5 p-0 bg-background-gray sm:rounded-2xl border-none"
          closeClassName="top-2 right-2"
        >
          <div className="p-4">
            <TradingBoxSettings
              toggleSettings={(mode) => setIsDialogOpen(mode)}
              slippageBps={slippageBps}
              setSlippageBps={setSlippageBps}
            />
          </div>
        </DialogContent>
      </Desktop>
    </Dialog>
  );
};
