import { IconArrowLeft } from "@tabler/icons-react";
import React from "react";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogPortal,
} from "~/components/ui/dialog";
import { Drawer, DrawerTrigger, DrawerContent } from "~/components/ui/drawer";
import { useIsMobile, usePrevious, cn, Mobile, Desktop } from "@mrgnlabs/mrgn-utils";
import { useActionBoxStore } from "../../store";

export interface ActionDialogProps {
  trigger?: React.ReactNode;
  title?: string;
  isTriggered?: boolean;
  onClose?: () => void;
  hidden?: boolean;
}

interface ActionDialogWrapperProps extends ActionDialogProps {
  children: React.ReactNode;
}

export const ActionDialogWrapper = ({
  trigger,
  children,
  title,
  isTriggered = false,
  onClose,
  hidden = false,
}: ActionDialogWrapperProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setIsOpen(isTriggered);
  }, [setIsOpen, isTriggered, onClose]);

  return (
    <>
      <Mobile>
        <Drawer
          open={isOpen}
          onOpenChange={(open) => {
            !open && onClose && onClose();
            setIsOpen(open);
          }}
        >
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent
            className={cn(
              "rounded-lg bg-mfi-action-box-background shadow-lg justify-start flex  border-none z-50 p-4 pt-0",
              hidden ? "opacity-0" : "opacity-100"
            )}
          >
            {children}
          </DrawerContent>
        </Drawer>
      </Mobile>
      <Desktop>
        <Dialog
          open={isOpen}
          modal
          onOpenChange={(open) => {
            !open && onClose && onClose();
            setIsOpen(open);
          }}
        >
          <DialogTrigger asChild>{trigger}</DialogTrigger>
          <DialogPortal>
            <DialogContent
              className={cn(
                "shadow-none overflow-visible md:flex md:max-w-[520px] md:py-3 md:px-5  sm:rounded-2xl bg-transparent border-none",
                hidden ? "opacity-0" : "opacity-100"
              )}
              closeClassName={"-top-1 -right-1"}
            >
              <DialogHeader className="sr-only">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{title}</DialogDescription>
              </DialogHeader>
              <div className="bg-mfi-action-box-background shadow-lg rounded-lg p-1">{children}</div>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      </Desktop>
    </>
  );
};
