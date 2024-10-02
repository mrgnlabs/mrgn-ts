import React from "react";

import Confetti from "react-confetti";
import { IconConfetti } from "@tabler/icons-react";
import { useWindowSize } from "@uidotdev/usehooks";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { PreviousTxn } from "@mrgnlabs/mrgn-utils";

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

type ActionCompleteProps = {
  isActionComplete: boolean;
  setIsActionComplete: (isActionComplete: boolean) => void;
  previousTxn: PreviousTxn;
};

export const ActionComplete = ({ isActionComplete, setIsActionComplete, previousTxn }: ActionCompleteProps) => {
  const { width, height } = useWindowSize();

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
        className={"z-[80]"}
        // className={cn(isMobile ? "z-[80]" : "z-[60]")}
      />
      <Dialog open={isActionComplete} onOpenChange={(open) => setIsActionComplete(open)}>
        <DialogContent className="z-[70] w-full">
          {/* <div className="space-y-12 w-full"> */}
          <DialogHeader>
            <DialogTitle className="space-y-4 text-center flex flex-col items-center justify-center">
              <IconConfetti size={48} />
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
          <DialogFooter className="mt-6">
            <Button className="w-full mx-auto" onClick={() => setIsActionComplete(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
