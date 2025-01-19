import React from "react";

import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { useIsMobile } from "~/hooks/use-is-mobile";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { Drawer, DrawerTrigger, DrawerContent } from "~/components/ui/drawer";

import { TradingBoxSettings } from "./settings";

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

  React.useEffect(() => {
    setIsDialogOpen(isDialogTriggered);
  }, [isDialogTriggered]);

  return (
    <>
      <Mobile>
        <Drawer open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
          <DrawerTrigger asChild>{children}</DrawerTrigger>
          <DrawerContent className="z-50 p-0">
            <div className="pt-7 px-4">
              <TradingBoxSettings
                toggleSettings={(mode) => setIsDialogOpen(mode)}
                slippageBps={slippageBps}
                setSlippageBps={setSlippageBps}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </Mobile>
      <Desktop>
        <Popover open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
          <PopoverTrigger asChild>{children}</PopoverTrigger>
          <PopoverContent className="p-4 max-w-[400px]">
            <TradingBoxSettings
              toggleSettings={(mode) => setIsDialogOpen(mode)}
              slippageBps={slippageBps}
              setSlippageBps={setSlippageBps}
            />
          </PopoverContent>
        </Popover>
      </Desktop>
    </>
  );
};
