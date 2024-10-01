import React from "react";

import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { useIsMobile } from "~/hooks/use-is-mobile";
import { Dialog, DialogTrigger, DialogContent } from "~/components/ui/dialog";

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
        {isDialogOpen && <div className="fixed inset-0 h-screen z-40 md:z-50 backdrop-blur-sm" />}
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          hideClose={true}
          className="mt-20 justify-start flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl z-40 md:z-50"
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
        <DialogContent className="md:flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl">
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
