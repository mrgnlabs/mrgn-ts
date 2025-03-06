import React from "react";
import Image from "next/image";
import { IconLoader2 } from "@tabler/icons-react";

import { ClosePositionActionTxns, cn } from "@mrgnlabs/mrgn-utils";
import { dynamicNumeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";

import { ArenaBank, ArenaPoolPositions, ArenaPoolV2Extended } from "~/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { SharePosition } from "~/components/common/share-position";

interface ClosePositionDialogProps {
  arenaPool: ArenaPoolV2Extended;
  actionTransaction: ClosePositionActionTxns | null;
  positionsByGroupPk: Record<string, ArenaPoolPositions>;
  depositBanks: ArenaBank[];
  borrowBank: ArenaBank | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  handleClosePosition: () => void;
  isLoading: boolean;
  pnl: number;
}

export const ClosePositionDialog = ({
  arenaPool,
  actionTransaction,
  positionsByGroupPk,
  depositBanks,
  borrowBank,
  isOpen,
  onOpenChange,
  handleClosePosition,
  isLoading,
  pnl,
}: ClosePositionDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className=" w-full h-full flex flex-col sm:justify-center sm:items-center justify-start items-center pt-16 sm:pt-0">
        <DialogHeader>
          <DialogTitle className="flex flex-col items-center gap-2 border-b border-border pb-10">
            <span className="flex items-center justify-center gap-2">
              {arenaPool.tokenBank && (
                <Image
                  className="rounded-full w-9 h-9"
                  src={arenaPool.tokenBank.meta.tokenLogoUri}
                  alt={(arenaPool.tokenBank?.meta.tokenSymbol || "Token") + "  logo"}
                  width={36}
                  height={36}
                />
              )}
              <span className="text-4xl font-medium">
                {`${arenaPool.tokenBank.meta.tokenSymbol}/${arenaPool.quoteBank.meta.tokenSymbol}`}
              </span>
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {`${arenaPool.tokenBank.meta.tokenSymbol}/${arenaPool.quoteBank.meta.tokenSymbol}`}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
          {pnl ? (
            <>
              <dt>PnL</dt>
              <dd className={cn("text-right", pnl > 0 && "text-mrgn-success", pnl < 0 && "text-mrgn-error")}>
                {pnl > 0 && "+"}${dynamicNumeralFormatter(pnl ?? 0)}
              </dd>
            </>
          ) : (
            <></>
          )}
          {depositBanks.map((bank) => (
            <React.Fragment key={bank.meta.tokenSymbol}>
              <dt>Supplied</dt>
              <dd className="text-right">
                {bank.isActive
                  ? dynamicNumeralFormatter(bank?.position.amount, {
                      ignoreMinDisplay: true,
                    })
                  : "0"}{" "}
                {bank.meta.tokenSymbol}
              </dd>
            </React.Fragment>
          ))}

          {borrowBank?.isActive && (
            <>
              <dt>Borrowed</dt>
              <dd className="text-right">
                {dynamicNumeralFormatter(borrowBank.position.amount, {
                  ignoreMinDisplay: true,
                })}{" "}
                {borrowBank.meta.tokenSymbol}
              </dd>
            </>
          )}

          {actionTransaction?.actionQuote?.priceImpactPct && (
            <>
              <dt>Price impact</dt>
              <dd
                className={cn(
                  Number(actionTransaction.actionQuote.priceImpactPct) > 0.05
                    ? "text-mrgn-error"
                    : Number(actionTransaction.actionQuote.priceImpactPct) > 0.01
                      ? "text-alert"
                      : "text-mrgn-success",
                  "text-right"
                )}
              >
                {percentFormatter.format(Number(actionTransaction.actionQuote.priceImpactPct))}
              </dd>
            </>
          )}

          {actionTransaction?.actionQuote?.slippageBps && (
            <>
              <dt>Slippage</dt>
              <dd
                className={cn(
                  actionTransaction.actionQuote.slippageBps > 500 ? "text-mrgn-error" : "text-mrgn-success",
                  "text-right"
                )}
              >
                {percentFormatter.format(Number(actionTransaction.actionQuote.slippageBps) / 10000)}
              </dd>
            </>
          )}

          <dt>Platform fee</dt>
          {actionTransaction?.actionQuote?.platformFee?.feeBps && (
            <>
              <dd className="text-right">
                {percentFormatter.format(actionTransaction.actionQuote.platformFee.feeBps / 10000)}
              </dd>
            </>
          )}
        </dl>
        <DialogFooter className="flex  w-full flex-col sm:flex-col items-center gap-4">
          <Button variant="destructive" className="w-full mx-auto" onClick={handleClosePosition} disabled={isLoading}>
            {isLoading ? <IconLoader2 className="animate-spin" /> : "Confirm close position"}{" "}
          </Button>
          <SharePosition pool={arenaPool} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
