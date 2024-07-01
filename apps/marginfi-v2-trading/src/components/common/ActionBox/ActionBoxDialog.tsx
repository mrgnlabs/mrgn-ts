import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";

import { useIsMobile } from "~/hooks/useIsMobile";
import { ActionBox } from "~/components/common/ActionBox";
import { Dialog, DialogTrigger, DialogOverlay, DialogContent, DialogClose } from "~/components/ui/dialog";
import { Desktop, Mobile } from "~/mediaQueries";
import { IconArrowLeft } from "~/components/ui/icons";
import { useMrgnlendStore } from "~/store";

type ActionBoxDialogProps = {
  requestedAction?: ActionType;
  requestedBank: ExtendedBankInfo | null;
  children: React.ReactNode;
  isActionBoxTriggered?: boolean;
};

export const ActionBoxDialog = ({
  requestedAction,
  requestedBank,
  children,
  isActionBoxTriggered = false,
}: ActionBoxDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    setIsDialogOpen(isActionBoxTriggered);
  }, [setIsDialogOpen, isActionBoxTriggered]);

  const titleText = React.useMemo(() => {
    if (
      requestedAction === ActionType.MintLST ||
      requestedAction === ActionType.MintYBX ||
      requestedAction === ActionType.UnstakeLST
    ) {
      return `${requestedAction}`;
    }

    return `${requestedAction} ${requestedBank?.meta.tokenSymbol}`;
  }, [requestedAction, requestedBank?.meta.tokenSymbol]);

  return (
    <Dialog open={isDialogOpen} modal={!isMobile} onOpenChange={(open) => setIsDialogOpen(open)}>
      <Mobile>
        {isDialogOpen && <div className="fixed inset-0 h-screen z-40 md:z-50 bg-background md:bg-background/80" />}
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          hideClose={true}
          className="mt-20 justify-start flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl bg-transparent border-none z-40 md:z-50"
        >
          <div>
            <div
              className="flex gap-2 items-center capitalize pl-2 cursor-pointer hover:underline"
              onClick={() => setIsDialogOpen(false)}
            >
              <IconArrowLeft /> {`${titleText}`}
            </div>
            <div className="p-4 h-screen mb-8">
              <ActionBox
                isDialog={true}
                handleCloseDialog={() => setIsDialogOpen(false)}
                requestedAction={requestedAction}
                requestedBank={requestedBank ?? undefined}
              />
            </div>
          </div>
        </DialogContent>
      </Mobile>

      <Desktop>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          className="md:flex md:max-w-[520px] md:py-3 md:px-5 p-0 sm:rounded-2xl bg-transparent border-none"
          closeClassName="top-2 right-2"
        >
          <div className="p-4">
            <ActionBox
              isDialog={true}
              handleCloseDialog={() => setIsDialogOpen(false)}
              requestedAction={requestedAction}
              requestedBank={requestedBank ?? undefined}
            />
          </div>
        </DialogContent>
      </Desktop>
    </Dialog>
  );
};
