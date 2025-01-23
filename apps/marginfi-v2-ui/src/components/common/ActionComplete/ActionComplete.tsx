import React from "react";

import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { cn } from "@mrgnlabs/mrgn-utils";

import { useUiStore } from "~/store";
import { useIsMobile } from "~/hooks/use-is-mobile";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

import * as screens from "./screens";

export const ActionCompleteMrgnUi = () => {
  const [isActionComplete, setIsActionComplete, previousTxn] = useUiStore((state) => [
    state.isActionComplete,
    state.setIsActionComplete,
    state.previousTxn,
  ]);

  const { width, height } = useWindowSize();
  const isMobile = useIsMobile();

  const headerText = React.useMemo(() => {
    if (previousTxn?.txnType === "CREATE_STAKED") {
      return "Staked Collateral!"; // TODO: update
    }
    return "Action completed";
  }, [previousTxn]);

  if (!isActionComplete || !previousTxn) return null;

  return (
    <div>
      <Confetti
        width={width!}
        height={height! * 2}
        recycle={false}
        opacity={0.4}
        className={cn(isMobile ? "z-[80]" : "z-[60]")}
      />
      <Dialog open={isActionComplete} onOpenChange={(open) => setIsActionComplete(open)}>
        <DialogContent className=" w-full h-full flex flex-col sm:justify-center sm:items-center justify-start items-center pt-16 sm:pt-0">
          <DialogHeader className="sr-only">
            <DialogTitle className="space-y-4 text-center flex flex-col items-center justify-center">
              <h2 className="font-medium text-xl">{headerText}</h2>
            </DialogTitle>
            <DialogDescription className="sr-only">{headerText}</DialogDescription>
          </DialogHeader>
          <div className="space-y-12 w-full">
            {previousTxn.txnType === "CREATE_STAKED" && (
              <screens.StakedCollatScreen {...previousTxn.createStakedOptions} txn={previousTxn.txn} />
            )}
          </div>
          <DialogFooter className="flex sm:flex-col gap-4 mt-6 w-full">
            <Button className="w-full" onClick={() => setIsActionComplete(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
