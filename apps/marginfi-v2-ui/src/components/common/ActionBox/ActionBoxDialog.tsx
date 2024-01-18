import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";

import { LendingModes } from "~/types";

import { ActionBox } from "~/components/common/ActionBox";
import { Dialog, DialogTrigger, DialogContent } from "~/components/ui/dialog";

type ActionBoxDialogProps = {
  requestedAction?: ActionType;
  requestedToken?: PublicKey;
  requestedLendingMode?: LendingModes;
  children: React.ReactNode;
};

export const ActionBoxDialog = ({
  requestedAction,
  requestedToken,
  requestedLendingMode,
  children,
}: ActionBoxDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="md:flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl bg-transparent">
        <ActionBox
          isDialog={true}
          handleCloseDialog={() => setIsDialogOpen(false)}
          requestedAction={requestedAction}
          requestedToken={requestedToken}
          requestedLendingMode={requestedLendingMode}
        />
      </DialogContent>
    </Dialog>
  );
};
