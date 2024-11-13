import React from "react";
import Link from "next/link";

import Confetti from "react-confetti";
import { IconConfetti, IconExternalLink } from "@tabler/icons-react";
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
  previousTxn: PreviousTxn;
  setIsActionComplete: (isActionComplete: boolean) => void;
};

export const ActionComplete = ({ isActionComplete, previousTxn, setIsActionComplete }: ActionCompleteProps) => {
  const { width, height } = useWindowSize();

  const isBase58Txn = React.useMemo(() => {
    const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Pattern.test(previousTxn.txn);
  }, [previousTxn.txn]);

  const txnLink = React.useMemo(() => {
    return isBase58Txn
      ? `https://solscan.io/tx/${previousTxn.txn}`
      : `https://explorer.jito.wtf/bundle/${previousTxn.txn}`;
  }, [isBase58Txn, previousTxn.txn]);

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
    } else if (previousTxn?.txnType === "LOOP") {
      return "Loop Completed!";
    } else if (previousTxn.txnType === "STAKE") {
      return "Stake Completed!";
    } else if (previousTxn.txnType === "UNSTAKE") {
      return "Unstake Completed!";
    } else {
      return "Action Completed!";
    }
  }, [previousTxn]);

  const handleClose = React.useCallback(() => {
    setIsActionComplete(false);
  }, [setIsActionComplete]);

  if (!isActionComplete || !previousTxn) return null;

  return (
    <div>
      <Confetti
        width={width!}
        height={height! * 2}
        recycle={false}
        opacity={0.4}
        className="z-[80]"
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
              <screens.LendingScreen {...previousTxn.lendingOptions} txn={previousTxn.txn} txnLink={txnLink} />
            )}
            {previousTxn.txnType === "TRADING" && (
              <screens.TradingScreen {...previousTxn.tradingOptions} txn={previousTxn.txn} txnLink={txnLink} />
            )}
            {previousTxn.txnType === "CLOSE_POSITION" && (
              <screens.ClosePositionScreen
                {...previousTxn.positionClosedOptions}
                txn={previousTxn.txn}
                txnLink={txnLink}
              />
            )}
            {previousTxn.txnType === "LOOP" && (
              <screens.LoopScreen {...previousTxn.loopOptions} txn={previousTxn.txn} txnLink={txnLink} />
            )}
            {(previousTxn.txnType === "STAKE" || previousTxn.txnType === "UNSTAKE") && (
              <screens.StakingScreen {...previousTxn.stakingOptions} txn={previousTxn.txn} txnLink={txnLink} />
            )}
          </div>
          <DialogFooter className="mt-6">
            <div className="space-y-4 w-full">
              <Button className="w-full mx-auto" onClick={handleClose}>
                Done
              </Button>
              <div className="flex flex-col sm:flex-row text-sm items-center justify-center text-center">
                <p className="opacity-60">Get daily alerts on your position using</p>
                <Link
                  href="https://t.me/AsgardWatchBot"
                  className="flex items-center gap-1.5 text-primary sm:ml-1.5"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="border-b border-border">AsgardWatchBot</span>{" "}
                  <IconExternalLink size={14} className="-translate-y-[1px]" />
                </Link>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
