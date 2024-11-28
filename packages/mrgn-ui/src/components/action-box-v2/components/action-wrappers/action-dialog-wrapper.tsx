import { IconArrowLeft } from "@tabler/icons-react";
import React from "react";

import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogHeader } from "~/components/ui/dialog";
import { useIsMobile, usePrevious, cn } from "@mrgnlabs/mrgn-utils";
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
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isActionComplete] = useActionBoxStore((state) => [state.isActionComplete]);
  const prevIsActionComplete = usePrevious(isActionComplete);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!prevIsActionComplete && isActionComplete) {
      setIsDialogOpen(false);
    }
  }, [prevIsActionComplete, isActionComplete]);

  React.useEffect(() => {
    setIsDialogOpen(isTriggered);
  }, [setIsDialogOpen, isTriggered]);

  return (
    <Dialog open={isDialogOpen} modal={!isMobile} onOpenChange={(open) => setIsDialogOpen(open)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        hideClose={isMobile}
        className={cn(
          "shadow-none overflow-visible",
          isMobile
            ? "mt-[60px] justify-start flex md:max-w-[520px] md:py-3 md:px-5 p-0 pt-6 sm:rounded-2xl border-none z-50"
            : "md:flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl bg-transparent border-none"
        )}
        closeClassName={!isMobile ? "-top-1 -right-1" : undefined}
      >
        <DialogHeader className="hidden">
          <DialogTitle></DialogTitle>
        </DialogHeader>
        <div>
          {isMobile && (
            <div
              className="flex gap-2 items-center capitalize pl-2 cursor-pointer hover:underline"
              onClick={() => setIsDialogOpen(false)}
            >
              <IconArrowLeft /> {title}
            </div>
          )}
          <div
            className={cn(
              "bg-mfi-action-box-background shadow-lg rounded-lg",
              isMobile ? "p-4 pt-0 h-screen mb-8 mt-5" : "p-1"
            )}
          >
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
