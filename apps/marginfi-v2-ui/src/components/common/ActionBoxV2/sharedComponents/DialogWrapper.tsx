import React from "react";

import { useIsMobile } from "~/hooks/useIsMobile";
import { Dialog, DialogTrigger, DialogContent } from "~/components/ui/dialog";
import { IconArrowLeft } from "~/components/ui/icons";

type DialogWrapperProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  title: string;
  isTriggered?: boolean;
};

export const DialogWrapper = ({ trigger, children, title, isTriggered = false }: DialogWrapperProps) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    setIsDialogOpen(isTriggered);
  }, [setIsDialogOpen, isTriggered]);

  return (
    <Dialog open={isDialogOpen} modal={!isMobile} onOpenChange={(open) => setIsDialogOpen(open)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        hideClose={isMobile}
        className={`${
          isMobile
            ? "mt-20 justify-start flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl border-none z-50"
            : "md:flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl bg-transparent border-none"
        }`}
        closeClassName={!isMobile ? "top-2 right-2" : undefined}
      >
        <div>
          {isMobile && (
            <div
              className="flex gap-2 items-center capitalize pl-2 cursor-pointer hover:underline"
              onClick={() => setIsDialogOpen(false)}
            >
              <IconArrowLeft /> {title}
            </div>
          )}
          <div className={`${isMobile ? "p-4 h-screen mb-8" : "p-4"}`}>{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
