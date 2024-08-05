import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { useIsMobile } from "~/hooks/useIsMobile";
import { ActionBox } from "~/components/common/ActionBox";
import { Dialog, DialogTrigger, DialogContent } from "~/components/ui/dialog";
import { Desktop, Mobile } from "~/mediaQueries";
import { IconArrowLeft } from "~/components/ui/icons";
import { GroupData } from "~/store/tradeStore";

type ActionBoxDialogProps = {
  requestedAction?: ActionType;
  requestedBank: ExtendedBankInfo | null;
  activeGroupArg?: GroupData | null;
  requestedCollateralBank?: ExtendedBankInfo;
  requestedAccount?: MarginfiAccountWrapper;
  children: React.ReactNode;
  isTokenSelectable?: boolean;
  isActionBoxTriggered?: boolean;
};

export const ActionBoxDialog = ({
  requestedAction,
  requestedBank,
  activeGroupArg,
  requestedCollateralBank,
  requestedAccount,
  children,
  isTokenSelectable,
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
                activeGroupArg={activeGroupArg}
                isDialog={true}
                handleCloseDialog={() => setIsDialogOpen(false)}
                requestedAction={requestedAction}
                requestedBank={requestedBank ?? undefined}
                isTokenSelectable={isTokenSelectable}
              />
            </div>
          </div>
        </DialogContent>
      </Mobile>

      <Desktop>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          className="md:flex md:max-w-[480px] md:py-3 md:px-0 p-0 sm:rounded-2xl"
          closeClassName="top-4 right-4"
        >
          <div className="p-4">
            <ActionBox
              activeGroupArg={activeGroupArg}
              isDialog={true}
              handleCloseDialog={() => setIsDialogOpen(false)}
              requestedAction={requestedAction}
              requestedBank={requestedBank ?? undefined}
              requestedAccount={requestedAccount}
              requestedCollateralBank={requestedCollateralBank}
              isTokenSelectable={isTokenSelectable}
            />
          </div>
        </DialogContent>
      </Desktop>
    </Dialog>
  );
};
