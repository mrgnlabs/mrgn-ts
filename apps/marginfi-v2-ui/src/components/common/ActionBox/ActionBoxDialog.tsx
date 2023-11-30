import React from "react";

import { ActionBox } from "~/components/common/ActionBox";

import { Dialog, DialogTrigger, DialogContent } from "~/components/ui/dialog";

type ActionBoxDialogProps = {
  children: React.ReactNode;
};

export const ActionBoxDialog = ({ children }: ActionBoxDialogProps) => {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="md:flex">
          <div className="flex items-center justify-center w-full">
            <ActionBox />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
