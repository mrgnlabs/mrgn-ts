import React from "react";

import Image from "next/image";
import Link from "next/link";

import { useUiStore } from "~/store";
import { getTokenImageURL } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";

const announcementLabel = "rlb-notice" as const;

export const AnnouncementsDialog = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { connected } = useWalletContext();
  const [isWalletOpen] = useUiStore((state) => [state.isWalletOpen]);

  const closeDialog = React.useCallback(() => {
    localStorage.setItem("mrgnAnnouncementPopup", announcementLabel);
    setIsOpen(false);
  }, []);

  React.useEffect(() => {
    // dont show popup for non-connected or when wallet is open
    if (isOpen || !connected || isWalletOpen) return;
    // only show announcement popup if tutorial has been acknowledged
    // and announcement has not been acknowledged
    if (
      localStorage.getItem("mrgnTutorialAcknowledged") &&
      (!localStorage.getItem("mrgnAnnouncementPopup") ||
        localStorage.getItem("mrgnAnnouncementPopup") !== announcementLabel)
    ) {
      setIsOpen(true);
      return;
    }
  }, [connected, isOpen, isWalletOpen]);

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex flex-col justify-center items-center gap-4">
            <Image src={getTokenImageURL("RLB")} width={60} height={60} alt="RLB" className="rounded-full" />
            RLB Discontinued
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center text-center">
          <p>
            RLB is being discontinued,{" "}
            <Link
              href="https://x.com/rollbitcom/status/1783420690714292461"
              target="_blank"
              rel="noreferrer"
              className="border-b border-primary/75 transition-colors hover:border-transparent"
            >
              read more here
            </Link>
            .
            <br /> The bank is now set to reduce-only.
          </p>
        </div>
        <DialogFooter className="flex items-center sm:justify-center mt-4">
          <Button variant="secondary" onClick={closeDialog}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
