import React from "react";

import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { Drawer, DrawerTrigger, DrawerContent } from "~/components/ui/drawer";

import { Settings, SettingsProps } from "./settings";

type ResponsiveSettingsWrapperProps = SettingsProps & {
  children: React.ReactNode;
  settingsDialogOpen: boolean;
  setSettingsDialogOpen: (open: boolean) => void;
};

export const ResponsiveSettingsWrapper = ({
  children,
  settingsDialogOpen,
  setSettingsDialogOpen,
  ...settingsProps
}: ResponsiveSettingsWrapperProps) => {
  return (
    <>
      <Mobile>
        <Drawer open={settingsDialogOpen} onOpenChange={(open) => setSettingsDialogOpen(open)}>
          <DrawerTrigger asChild>{children}</DrawerTrigger>
          <DrawerContent className="z-50 pb-6">
            <div className="pt-7 px-4">
              <Settings {...settingsProps} />
            </div>
          </DrawerContent>
        </Drawer>
      </Mobile>

      <Desktop>
        <Popover open={settingsDialogOpen} onOpenChange={(open) => setSettingsDialogOpen(open)}>
          <PopoverTrigger asChild>{children}</PopoverTrigger>
          <PopoverContent className="p-4 max-w-[400px]">
            <Settings {...settingsProps} />
          </PopoverContent>
        </Popover>
      </Desktop>
    </>
  );
};
