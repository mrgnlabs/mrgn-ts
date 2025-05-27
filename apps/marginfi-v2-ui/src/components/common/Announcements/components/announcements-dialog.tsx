import React from "react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";

import { AnnouncementEmode } from "./announcement-dialog-contents";

const announcementLabel = "rlb-notice" as const;

export const AnnouncementsDialog = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  const closeDialog = React.useCallback(() => {
    // localStorage.setItem(`mrgnAnnouncementPopup-${announcementLabel}`, announcementLabel);
    setIsOpen(false);
  }, []);

  React.useEffect(() => {
    // const announcementPopup = localStorage.getItem(`mrgnAnnouncementPopup-${announcementLabel}`);
    // if (!announcementPopup) {
    //   setIsOpen(true);
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
      <DialogContent className="md:max-w-4xl md:p-0 bg-transparent">
        <DialogHeader className="sr-only">
          <DialogTitle>Marginfi Announcement</DialogTitle>
        </DialogHeader>
        <AnnouncementEmode />
      </DialogContent>
    </Dialog>
  );
};
