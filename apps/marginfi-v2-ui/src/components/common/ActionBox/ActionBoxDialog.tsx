import React from "react";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";

import { ActionBox } from "~/components/common/ActionBox";

import { Dialog, DialogTrigger, DialogContent } from "~/components/ui/dialog";
import { LendingModes } from "~/types";

type ActionBoxDialogProps = {
  requestedAction?: ActionType;
  requestedToken?: PublicKey;
  requestedLendingMode?: LendingModes;
  children: React.ReactNode;
};

export const ActionBoxDialog = ({ requestedAction, requestedToken, requestedLendingMode, children }: ActionBoxDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="md:flex md:max-w-[520px] md:p-4 p-0">
        <ActionBox isDialog={true} requestedAction={requestedAction} requestedToken={requestedToken} requestedLendingMode={requestedLendingMode} />
      </DialogContent>
    </Dialog>
  );
};
