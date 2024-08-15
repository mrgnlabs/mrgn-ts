import React from "react";

import Image from "next/image";

import { IconMinus, IconX, IconPlus } from "@tabler/icons-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

import { MarginfiAccountWrapper, MarginfiClient, getConfig } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo, ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { useConnection } from "~/hooks/useConnection";
import { useTradeStore, useUiStore } from "~/store";
import { GroupData } from "~/store/tradeStore";
import { useWalletContext } from "~/hooks/useWalletContext";
import { calculateClosePositions, cn, extractErrorString, getTokenImageURL, capture } from "~/utils";
import { MultiStepToastHandle } from "~/utils/toastUtils";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { QuoteResponse } from "@jup-ag/api";
import { percentFormatter } from "@mrgnlabs/mrgn-common";
import { IconLoader } from "~/components/ui/icons";

type PositionActionButtonsProps = {
  isBorrowing: boolean;
  rightAlignFinalButton?: boolean;
  activeGroup: GroupData;
};

export const PositionActionButtons = ({
  isBorrowing,
  rightAlignFinalButton = false,
  activeGroup,
}: PositionActionButtonsProps) => {
  const { connection } = useConnection();
  const { wallet } = useWalletContext();
  const [platformFeeBps] = useUiStore((state) => [state.platformFeeBps]);
  const [actionTransaction, setActionTransaction] = React.useState<{
    closeTxn: VersionedTransaction | Transaction;
    bundleTipTxn: VersionedTransaction | null;
    quote?: QuoteResponse;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [multiStepToast, setMultiStepToast] = React.useState<MultiStepToastHandle | null>(null);
  const [isClosing, setIsClosing] = React.useState(false);

  const [refreshGroup, setIsRefreshingStore] = useTradeStore((state) => [
    state.refreshGroup,
    state.setIsRefreshingStore,
  ]);
  const [slippageBps, priorityFee, setIsActionComplete, setPreviousTxn] = useUiStore((state) => [
    state.slippageBps,
    state.priorityFee,
    state.setIsActionComplete,
    state.setPreviousTxn,
  ]);

  const depositBanks = React.useMemo(() => {
    const tokenBank = activeGroup.pool.token.isActive ? activeGroup.pool.token : null;
    const quoteBank = activeGroup.pool.quoteTokens.filter((bank) => bank.isActive)[0] ?? null;

    return [tokenBank, quoteBank].filter((bank): bank is ActiveBankInfo => bank !== null && bank.position.isLending);
  }, [activeGroup]);

  const borrowBank = React.useMemo(() => {
    const tokenBank = activeGroup.pool.token.isActive ? activeGroup.pool.token : null;
    const quoteBank = activeGroup.pool.quoteTokens.filter((bank) => bank.isActive)[0] ?? null;

    let borrowBank = null;
    if (tokenBank && !tokenBank.position.isLending) {
      borrowBank = tokenBank;
    } else if (quoteBank && !quoteBank.position.isLending) {
      borrowBank = quoteBank;
    }

    return borrowBank;
  }, [activeGroup]);

  const closeTransaction = React.useCallback(async () => {
    if (!activeGroup.selectedAccount || (!borrowBank && !depositBanks[0])) return;
    setIsClosing(true);

    const multiStepToast = new MultiStepToastHandle("Closing position", [
      {
        label: `Closing ${depositBanks[0].meta.tokenSymbol}${
          borrowBank ? "/" + borrowBank?.meta.tokenSymbol : ""
        } position.`,
      },
    ]);

    multiStepToast.start();

    try {
      if (!activeGroup) {
        throw new Error("Invalid client");
      }

      const txns = await calculateClosePositions({
        marginfiAccount: activeGroup.selectedAccount,
        depositBanks: depositBanks,
        borrowBank: borrowBank,
        slippageBps,
        connection: connection,
        priorityFee,
        platformFeeBps,
      });

      if ("description" in txns) {
        throw new Error(txns?.description ?? "Something went wrong.");
      } else if ("closeTxn" in txns) {
        setActionTransaction(txns);
      }
    } catch (error: any) {
      const msg = extractErrorString(error);

      multiStepToast.setFailed(msg);
      console.log(`Error while closing: ${msg}`);
      console.log(error);
    } finally {
      setMultiStepToast(multiStepToast);
    }
    setIsClosing(false);
  }, [
    activeGroup,
    slippageBps,
    connection,
    priorityFee,
    platformFeeBps,
    wallet,
    setIsRefreshingStore,
    refreshGroup,
    borrowBank,
    depositBanks,
    setIsClosing,
  ]);

  const processTransaction = React.useCallback(async () => {
    try {
      setIsLoading(true);
      let txnSig: string | string[] = "";

      if (!actionTransaction || !multiStepToast) throw new Error("Action not ready");
      if (actionTransaction.closeTxn instanceof Transaction) {
        txnSig = await activeGroup.client.processTransaction(actionTransaction.closeTxn);
        multiStepToast.setSuccessAndNext();
      } else {
        txnSig = await activeGroup.client.processTransactions([
          ...(actionTransaction.bundleTipTxn ? [actionTransaction.bundleTipTxn] : []),
          actionTransaction.closeTxn,
        ]);
        multiStepToast.setSuccessAndNext();
      }

      if (txnSig) {
        setActionTransaction(null);
        setIsActionComplete(true);
        setPreviousTxn({
          txnType: "CLOSE_POSITION",
          txn: Array.isArray(txnSig) ? txnSig.pop() ?? "" : txnSig!,
          positionClosedOptions: {
            tokenBank: activeGroup.pool.token,
            collateralBank: activeGroup.pool.quoteTokens[0],
          },
        });
        capture("close_position", {
          group: activeGroup?.groupPk?.toBase58(),
          txnSig: txnSig,
          token: activeGroup.pool.token.meta.tokenSymbol,
          tokenSize: activeGroup.pool.token.isActive ? activeGroup.pool.token.position.amount : 0,
          usdcSize: activeGroup.pool.quoteTokens[0].isActive ? activeGroup.pool.quoteTokens[0].position.amount : 0,
        });
      }
      // -------- Refresh state
      try {
        setIsRefreshingStore(true);
        await refreshGroup({
          connection,
          wallet,
          groupPk: activeGroup?.groupPk,
        });
      } catch (error: any) {
        console.log("Error while reloading state");
        console.log(error);
      }
      return txnSig;
    } catch (error: any) {
      const msg = extractErrorString(error);

      if (multiStepToast) {
        multiStepToast.setFailed(msg);
      }
      console.log(`Error while closing: ${msg}`);
      console.log(error);
    } finally {
      setIsLoading(false);
      setActionTransaction(null);
      setMultiStepToast(null);
    }
  }, [actionTransaction, multiStepToast, activeGroup]);

  const onClose = React.useCallback(() => {
    if (multiStepToast) {
      multiStepToast.setFailed("User canceled transaction.");
    }

    setActionTransaction(null);
    setMultiStepToast(null);
  }, [multiStepToast, setActionTransaction, setMultiStepToast]);

  return (
    <div className="flex gap-3 w-full">
      <ActionBoxDialog
        requestedBank={depositBanks[0]}
        requestedAction={ActionType.Deposit}
        requestedAccount={activeGroup.selectedAccount ?? undefined}
        activeGroupArg={activeGroup}
      >
        <Button variant="outline" size="sm" className="gap-1 min-w-16">
          <IconPlus size={14} />
          Add
        </Button>
      </ActionBoxDialog>
      {borrowBank && isBorrowing && (
        <ActionBoxDialog
          requestedBank={borrowBank}
          requestedAction={ActionType.Repay}
          requestedAccount={activeGroup.selectedAccount ?? undefined}
          activeGroupArg={activeGroup}
        >
          <Button variant="outline" size="sm" className="gap-1 min-w-16">
            <IconMinus size={14} />
            Reduce
          </Button>
        </ActionBoxDialog>
      )}
      {!isBorrowing && (
        <ActionBoxDialog
          activeGroupArg={activeGroup}
          requestedBank={depositBanks[0]}
          requestedAction={ActionType.Withdraw}
          requestedAccount={activeGroup.selectedAccount ?? undefined}
          requestedCollateralBank={depositBanks.length > 1 ? depositBanks[1] : undefined}
        >
          <Button variant="outline" size="sm" className="gap-1 min-w-16">
            <IconMinus size={14} />
            Withdraw
          </Button>
        </ActionBoxDialog>
      )}
      <Button
        onClick={() => closeTransaction()}
        disabled={isClosing}
        variant="destructive"
        size="sm"
        className={cn("gap-1 min-w-16", rightAlignFinalButton && "ml-auto")}
      >
        <IconX size={14} />
        Close
      </Button>

      <Dialog open={!!actionTransaction} onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-2 border-b border-border pb-10">
              <span className="flex items-center justify-center gap-2">
                {activeGroup.pool.token && (
                  <Image
                    className="rounded-full w-9 h-9"
                    src={getTokenImageURL(activeGroup.pool.token.info.state.mint.toString())}
                    alt={(activeGroup.pool.token?.meta.tokenSymbol || "Token") + "  logo"}
                    width={36}
                    height={36}
                  />
                )}
                <span className="text-4xl font-medium">
                  {`${activeGroup.pool.token.meta.tokenSymbol}/${activeGroup.pool.quoteTokens[0].meta.tokenSymbol}`}
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="space-y-12 w-full">
            <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
              {depositBanks.map((bank) => (
                <React.Fragment key={bank.meta.tokenSymbol}>
                  <dt>Supplied</dt>
                  <dd className="text-right">
                    {bank.position.amount} {bank.meta.tokenSymbol}
                  </dd>
                </React.Fragment>
              ))}

              {borrowBank && (
                <>
                  <dt>Borrowed</dt>
                  <dd className="text-right">
                    {borrowBank.position.amount} {borrowBank.meta.tokenSymbol}
                  </dd>
                </>
              )}

              {actionTransaction?.quote?.priceImpactPct && (
                <>
                  <dt>Price impact</dt>
                  <dd
                    className={cn(
                      Number(actionTransaction.quote.priceImpactPct) > 0.05
                        ? "text-mrgn-error"
                        : Number(actionTransaction.quote.priceImpactPct) > 0.01
                        ? "text-alert-foreground"
                        : "text-mrgn-success",
                      "text-right"
                    )}
                  >
                    {percentFormatter.format(Number(actionTransaction.quote.priceImpactPct))}
                  </dd>
                </>
              )}

              {actionTransaction?.quote?.slippageBps && (
                <>
                  <dt>Slippage</dt>
                  <dd
                    className={cn(actionTransaction.quote.slippageBps > 500 && "text-alert-foreground", "text-right")}
                  >
                    {percentFormatter.format(Number(actionTransaction.quote.slippageBps) / 10000)}
                  </dd>
                </>
              )}

              <dt>Platform fee</dt>
              {actionTransaction?.quote?.platformFee?.feeBps && (
                <>
                  <dd className="text-right">
                    {percentFormatter.format(actionTransaction.quote.platformFee.feeBps / 10000)}
                  </dd>
                </>
              )}
            </dl>
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={isLoading}
              className="w-full mx-auto"
              onClick={() => processTransaction()}
            >
              {isLoading ? <IconLoader /> : "Confirm close position"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
