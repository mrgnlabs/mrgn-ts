import React from "react";

import { ActionBox } from "~/components/common/ActionBox";

import { Dialog, DialogTrigger, DialogContent } from "~/components/ui/dialog";

type ActionBoxDialogProps = {
  children: React.ReactNode;
};

export const ActionBoxDialog = ({ children }: ActionBoxDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="md:flex md:max-w-[520px] md:p-4">
        <ActionBox />
      </DialogContent>
    </Dialog>
  );
};
