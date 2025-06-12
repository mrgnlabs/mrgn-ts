import React from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";

import { AnnouncementEmode } from "./announcement-dialog-contents";
import { Desktop, Mobile } from "~/mediaQueryUtils";
import { Drawer, DrawerContent } from "~/components/ui/drawer";

const announcementLabel = "emode" as const;

export const AnnouncementsDialog = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  const closeDialog = React.useCallback(() => {
    localStorage.setItem(`mrgnAnnouncementPopup-${announcementLabel}`, announcementLabel);
    setIsOpen(false);
  }, []);

  React.useEffect(() => {
    const tutorialAcknowledged = localStorage.getItem("mrgnTutorialAcknowledged");
    const announcementPopup = localStorage.getItem(`mrgnAnnouncementPopup-${announcementLabel}`);

    // Only show announcement if tutorial has been acknowledged and announcement hasn't been shown
    if (tutorialAcknowledged && !announcementPopup) {
      setIsOpen(true);
    }
  }, []);

  return (
    <>
      <Desktop>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeDialog();
            } else {
              setIsOpen(true);
            }
          }}
        >
          <DialogContent className="md:max-w-6xl p-0 bg-transparent border-none" closeClassName="hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>Marginfi Announcement</DialogTitle>
            </DialogHeader>
            <AnnouncementEmode onClose={closeDialog} />
          </DialogContent>
        </Dialog>
      </Desktop>

      <Mobile>
        <Drawer
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeDialog();
            } else {
              setIsOpen(true);
            }
          }}
        >
          <DrawerContent hideTopTrigger>
            <AnnouncementEmode onClose={closeDialog} />
          </DrawerContent>
        </Drawer>
      </Mobile>
    </>
  );
};
