import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";

import { ActionBox } from "~/components/common/ActionBox";
import { Dialog, DialogTrigger, DialogContent } from "~/components/ui/dialog";

type ActionBoxDialogProps = {
  requestedAction?: ActionType;
  requestedToken?: PublicKey;
  children: React.ReactNode;
  isActionBoxTriggered?: boolean;
};

export const ActionBoxDialog = ({
  requestedAction,
  requestedToken,
  children,
  isActionBoxTriggered = false,
}: ActionBoxDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setIsDialogOpen(isActionBoxTriggered);
  }, [setIsDialogOpen, isActionBoxTriggered]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="md:flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl bg-transparent border-none">
        <div className="p-4">
          <ActionBox
            isDialog={true}
            handleCloseDialog={() => setIsDialogOpen(false)}
            requestedAction={requestedAction}
            requestedToken={requestedToken}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
