import React from "react";

import Confetti from "react-confetti";
import { IconConfetti } from "@tabler/icons-react";
import { useWindowSize } from "@uidotdev/usehooks";
import { cn } from "@mrgnlabs/mrgn-utils";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { useUiStore } from "~/store";
import { useIsMobile } from "~/hooks/use-is-mobile";

import { SharePosition } from "~/components/common/share-position/share-position";
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

export const ArenaActionComplete = () => {
  const [isActionComplete, setIsActionComplete, previousTxn] = useUiStore((state) => [
    state.isActionComplete,
    state.setIsActionComplete,
    state.previousTxn,
  ]);

  const { width, height } = useWindowSize();
  const isMobile = useIsMobile();

  const headerText = React.useMemo(() => {
    if (previousTxn?.txnType === "LEND") {
      switch (previousTxn.lendingOptions.type) {
        case ActionType.Deposit:
          return "Deposit Completed!";
        case ActionType.MintLST:
          return "LST Minted!";
        default:
          return `${previousTxn.lendingOptions.type} Completed!`;
      }
    } else if (previousTxn?.txnType === "TRADING") {
      if (previousTxn.tradingOptions.type === "long") {
        return "Longing Completed!";
      } else {
        return "Shorting Completed!";
      }
    } else {
      return "Action Completed!";
    }
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
        <DialogContent className=" w-full">
          {/* <div className="space-y-12 w-full"> */}
          <DialogHeader className="sr-only">
            <DialogTitle className="space-y-4 text-center flex flex-col items-center justify-center">
              <h2 className="font-medium text-xl">{headerText}</h2>
            </DialogTitle>
            <DialogDescription className="sr-only">{headerText}</DialogDescription>
          </DialogHeader>
          <div className="space-y-12 w-full">
            {previousTxn.txnType === "LEND" && (
              <screens.LendingScreen {...previousTxn.lendingOptions} txn={previousTxn.txn} />
            )}
            {previousTxn.txnType === "TRADING" && (
              <screens.TradingScreen {...previousTxn.tradingOptions} txn={previousTxn.txn} />
            )}
            {previousTxn.txnType === "CLOSE_POSITION" && (
              <screens.ClosePositionScreen {...previousTxn.positionClosedOptions} txn={previousTxn.txn} />
            )}
          </div>
          <DialogFooter className="flex sm:flex-col gap-4 mt-6">
            {previousTxn.txnType === "CLOSE_POSITION" ? (
              <div className="flex items-center justify-center">
                <SharePosition
                  pool={previousTxn.positionClosedOptions.pool}
                  triggerVariant="outline"
                  triggerClassName="w-full max-w-none h-10"
                />
              </div>
            ) : (
              <Button className="w-full" onClick={() => setIsActionComplete(false)}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
