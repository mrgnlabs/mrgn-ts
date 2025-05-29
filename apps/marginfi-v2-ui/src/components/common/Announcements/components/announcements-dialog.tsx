import React from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";

import { AnnouncementEmode } from "./announcement-dialog-contents";

const announcementLabel = "emode" as const;

export const AnnouncementsDialog = () => {
  const [isOpen, setIsOpen] = React.useState(true);

  const closeDialog = React.useCallback(() => {
    // localStorage.setItem(`mrgnAnnouncementPopup-${announcementLabel}`, announcementLabel);
    setIsOpen(false);
  }, []);

  React.useEffect(() => {
    // const announcementPopup = localStorage.getItem(`mrgnAnnouncementPopup-${announcementLabel}`);
    // if (!announcementPopup) {
    // setIsOpen(true);
    // }
  }, []);

  return (
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
  );
};
