import { IconArrowLeft } from "@tabler/icons-react";
import React from "react";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "~/components/ui/dialog";
import { Drawer, DrawerTrigger, DrawerContent } from "~/components/ui/drawer";
import { useIsMobile, usePrevious, cn, Mobile, Desktop } from "@mrgnlabs/mrgn-utils";
import { useActionBoxStore } from "../../store";

export interface ActionDialogProps {
  trigger: React.ReactNode;
  title: string;
  isTriggered?: boolean;
}

interface ActionDialogWrapperProps extends ActionDialogProps {
  children: React.ReactNode;
}

export const ActionDialogWrapper = ({ trigger, children, title, isTriggered = false }: ActionDialogWrapperProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isActionComplete] = useActionBoxStore((state) => [state.isActionComplete]);
  const prevIsActionComplete = usePrevious(isActionComplete);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!prevIsActionComplete && isActionComplete) {
      setIsOpen(false);
    }
  }, [prevIsActionComplete, isActionComplete]);

  React.useEffect(() => {
    setIsOpen(isTriggered);
  }, [setIsOpen, isTriggered]);

  return (
    <>
      <Mobile>
        <Drawer open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent className="rounded-lg bg-mfi-action-box-background shadow-lg justify-start flex  border-none z-50 p-4 pt-0">
            {children}
          </DrawerContent>
        </Drawer>
      </Mobile>
      <Desktop>
        <Dialog open={isOpen} modal onOpenChange={(open) => setIsOpen(open)}>
          <DialogTrigger asChild>{trigger}</DialogTrigger>
          <DialogContent
            className={
              "shadow-none overflow-visible md:flex md:max-w-[520px] md:py-3 md:px-5  sm:rounded-2xl bg-transparent border-none"
            }
            closeClassName={"-top-1 -right-1"}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{title}</DialogDescription>
            </DialogHeader>
            <div className="bg-mfi-action-box-background shadow-lg rounded-lg p-1">{children}</div>
          </DialogContent>
        </Dialog>
      </Desktop>
    </>
  );
};
