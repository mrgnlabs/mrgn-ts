import React from "react";

import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { Dialog, DialogTrigger, DialogContent } from "~/components/ui/dialog";
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
        <Dialog open={settingsDialogOpen} onOpenChange={(open) => setSettingsDialogOpen(open)}>
          <DialogTrigger asChild>{children}</DialogTrigger>
          <DialogContent className="p-4 max-w-[400px]">
            <Settings {...settingsProps} />
          </DialogContent>
        </Dialog>
      </Desktop>
    </>
  );
};
