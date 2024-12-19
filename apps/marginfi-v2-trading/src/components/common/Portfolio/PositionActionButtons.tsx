import React from "react";

import Image from "next/image";

import { IconMinus, IconX, IconPlus, IconLoader2 } from "@tabler/icons-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { MultiStepToastHandle, cn, extractErrorString, capture, ClosePositionActionTxns } from "@mrgnlabs/mrgn-utils";
import { ActiveBankInfo, ActionType, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";

import { useConnection } from "~/hooks/use-connection";
import { useTradeStoreV2, useUiStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { calculateClosePositions } from "~/utils";
import { usePositionsData } from "~/hooks/usePositionsData";
import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";

import { ActionBox, ActionBoxProvider } from "~/components/action-box-v2";
import { SharePosition } from "~/components/common/share-position/share-position";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { QuoteResponse } from "@jup-ag/api";
import { dynamicNumeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ArenaPoolV2Extended } from "~/types/trade-store.types";

type PositionActionButtonsProps = {
  isBorrowing: boolean;
  arenaPool: ArenaPoolV2Extended;
  accountSummary: AccountSummary;
  client: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
};

export const PositionActionButtons = ({
  isBorrowing,
  arenaPool,
  accountSummary,
  client,
  selectedAccount,
}: PositionActionButtonsProps) => {
  const { connection } = useConnection();
  const { wallet, connected } = useWallet();
  const [platformFeeBps] = useUiStore((state) => [state.platformFeeBps]);
  const [actionTransaction, setActionTransaction] = React.useState<ClosePositionActionTxns | null>(null);

  const [isLoading, setIsLoading] = React.useState(false);
  const [multiStepToast, setMultiStepToast] = React.useState<MultiStepToastHandle | null>(null);
  const [isClosing, setIsClosing] = React.useState(false);

  const [refreshGroup, setIsRefreshingStore, nativeSolBalance, positionsByGroupPk] = useTradeStoreV2((state) => [
    state.refreshGroup,
    state.setIsRefreshingStore,
    state.nativeSolBalance,
    state.positionsByGroupPk,
  ]);
  const [slippageBps, priorityFees, broadcastType, setIsActionComplete, setPreviousTxn] = useUiStore((state) => [
    state.slippageBps,
    state.priorityFees,
    state.broadcastType,
    state.setIsActionComplete,
    state.setPreviousTxn,
  ]);

  const positionData = usePositionsData({ groupPk: arenaPool.groupPk });
  const { positionSizeUsd, leverage } = useLeveragedPositionDetails({
    pool: arenaPool,
  });

  const depositBanks = React.useMemo(() => {
    const tokenBank = arenaPool.tokenBank.isActive ? arenaPool.tokenBank : null;
    const quoteBank = arenaPool.quoteBank.isActive ? arenaPool.quoteBank : null;

    return [tokenBank, quoteBank].filter((bank): bank is ActiveBankInfo => bank !== null && bank.position.isLending);
  }, [arenaPool]);

  const borrowBank = React.useMemo(() => {
    const tokenBank = arenaPool.tokenBank.isActive ? arenaPool.tokenBank : null;
    const quoteBank = arenaPool.quoteBank.isActive ? arenaPool.quoteBank : null;

    let borrowBank = null;
    if (tokenBank && !tokenBank.position.isLending) {
      borrowBank = tokenBank;
    } else if (quoteBank && !quoteBank.position.isLending) {
      borrowBank = quoteBank;
    }

    return borrowBank;
  }, [arenaPool]);

  const closeTransaction = React.useCallback(async () => {
    if (!selectedAccount || (!borrowBank && !depositBanks[0])) return;
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
      const txns = await calculateClosePositions({
        marginfiAccount: selectedAccount,
        depositBanks: depositBanks,
        borrowBank: borrowBank,
        slippageBps,
        connection: connection,
        platformFeeBps,
      });

      if ("actionTxn" in txns) {
        txns.groupKey = selectedAccount.group.address;
      }

      if ("description" in txns) {
        throw new Error(txns?.description ?? "Something went wrong.");
      } else if ("actionTxn" in txns) {
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
  }, [selectedAccount, borrowBank, depositBanks, slippageBps, connection, platformFeeBps]);

  const processTransaction = React.useCallback(async () => {
    try {
      setIsLoading(true);
      let txnSig: string | string[] = "";

      if (!client || !actionTransaction?.actionTxn || !multiStepToast) throw new Error("Action not ready");
      txnSig = await client.processTransactions([...actionTransaction.additionalTxns, actionTransaction.actionTxn], {
        broadcastType: broadcastType,
        ...priorityFees,
      });
      multiStepToast.setSuccessAndNext();

      if (txnSig) {
        setActionTransaction(null);
        setIsActionComplete(true);
        setPreviousTxn({
          txnType: "CLOSE_POSITION",
          txn: Array.isArray(txnSig) ? txnSig[txnSig.length - 1] : txnSig!,
          positionClosedOptions: {
            tokenBank: arenaPool.tokenBank,
            collateralBank: arenaPool.quoteBank,
            size: positionSizeUsd,
            leverage: Number(leverage),
            entryPrice: positionData.entryPrice,
            exitPrice: arenaPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber(),
            pnl: positionData.pnl,
          },
        });
        capture("close_position", {
          group: arenaPool.groupPk?.toBase58(),
          txnSig: txnSig,
          token: arenaPool.tokenBank.meta.tokenSymbol,
          tokenSize: arenaPool.tokenBank.isActive ? arenaPool.tokenBank.position.amount : 0,
          usdcSize: arenaPool.quoteBank.isActive ? arenaPool.quoteBank.position.amount : 0,
        });
      }
      // -------- Refresh state
      try {
        setIsRefreshingStore(true);
        await refreshGroup({
          connection,
          wallet,
          groupPk: arenaPool.groupPk,
          banks: [arenaPool.tokenBank.address, arenaPool.quoteBank.address],
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
  }, [
    client,
    actionTransaction,
    multiStepToast,
    broadcastType,
    priorityFees,
    setIsActionComplete,
    setPreviousTxn,
    arenaPool,
    setIsRefreshingStore,
    refreshGroup,
    connection,
    wallet,
  ]);

  const onClose = React.useCallback(() => {
    if (multiStepToast) {
      multiStepToast.setFailed("User canceled transaction.");
    }

    setActionTransaction(null);
    setMultiStepToast(null);
  }, [multiStepToast, setActionTransaction, setMultiStepToast]);

  return (
    <ActionBoxProvider
      banks={[arenaPool.tokenBank, arenaPool.quoteBank]}
      nativeSolBalance={nativeSolBalance}
      marginfiClient={client}
      selectedAccount={selectedAccount}
      connected={connected}
      accountSummaryArg={accountSummary}
      showActionComplete={false}
      hidePoolStats={["type"]}
    >
      <div className="flex gap-3 w-full">
        <ActionBox.Lend
          isDialog={true}
          useProvider={true}
          lendProps={{
            connected: connected,
            requestedLendType: ActionType.Deposit,
            requestedBank: depositBanks[0] ?? undefined,
            showAvailableCollateral: false,
            captureEvent: () => {
              capture("position_add_btn_click", {
                group: arenaPool.groupPk?.toBase58(),
                token: arenaPool.tokenBank.meta.tokenSymbol,
              });
            },
            onComplete: () => {
              refreshGroup({
                connection,
                wallet,
                groupPk: arenaPool.groupPk,
                banks: [arenaPool.tokenBank.address, arenaPool.quoteBank.address],
              });
            },
          }}
          dialogProps={{
            trigger: (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 min-w-16"
                onClick={() => {
                  capture("position_add_btn_click", {
                    group: arenaPool.groupPk?.toBase58(),
                    token: arenaPool.tokenBank.meta.tokenSymbol,
                  });
                }}
              >
                <IconPlus size={14} />
                Add
              </Button>
            ),
            title: `Supply ${arenaPool.tokenBank.meta.tokenSymbol}`,
          }}
        />
        {borrowBank && isBorrowing && (
          <ActionBox.Repay
            useProvider={true}
            repayProps={{
              requestedBank: borrowBank,
              connected: connected,
              showAvailableCollateral: false,
              captureEvent: (event, properties) => {
                capture("position_reduce_btn_click", {
                  group: arenaPool.groupPk?.toBase58(),
                  token: arenaPool.tokenBank.meta.tokenSymbol,
                });
              },
              onComplete: () => {
                refreshGroup({
                  connection,
                  wallet,
                  groupPk: arenaPool.groupPk,
                  banks: [arenaPool.tokenBank.address, arenaPool.quoteBank.address],
                });
              },
            }}
            isDialog={true}
            dialogProps={{
              trigger: (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 min-w-16"
                  onClick={() => {
                    capture("position_reduce_btn_click", {
                      group: arenaPool.groupPk?.toBase58(),
                      token: arenaPool.tokenBank.meta.tokenSymbol,
                    });
                  }}
                >
                  <IconMinus size={14} />
                  Reduce
                </Button>
              ),
              title: `Reduce ${borrowBank?.meta.tokenSymbol}`,
            }}
          />
        )}
        {!isBorrowing && (
          <ActionBox.Lend
            isDialog={true}
            useProvider={true}
            lendProps={{
              connected: connected,
              requestedLendType: ActionType.Withdraw,
              requestedBank: arenaPool.tokenBank ?? undefined,
              captureEvent: () => {
                capture("position_withdraw_btn_click", {
                  group: arenaPool.groupPk?.toBase58(),
                  token: arenaPool.tokenBank.meta.tokenSymbol,
                });
              },
              onComplete: () => {
                refreshGroup({
                  connection,
                  wallet,
                  groupPk: arenaPool.groupPk,
                  banks: [arenaPool.tokenBank.address, arenaPool.quoteBank.address],
                });
              },
            }}
            dialogProps={{
              trigger: (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 min-w-16"
                  onClick={() => {
                    capture("position_add_btn_click", {
                      group: arenaPool.groupPk?.toBase58(),
                      token: arenaPool.tokenBank.meta.tokenSymbol,
                    });
                  }}
                >
                  <IconPlus size={14} />
                  Withdraw
                </Button>
              ),
              title: `Withdraw ${arenaPool.tokenBank.meta.tokenSymbol}`,
            }}
          />
        )}

        <Button
          onClick={() => closeTransaction()}
          disabled={isClosing}
          variant="destructive"
          size="sm"
          className="gap-1 min-w-16"
        >
          <IconX size={14} />
          Close
        </Button>

        <Dialog open={!!actionTransaction} onOpenChange={() => onClose()}>
          <DialogContent className=" w-full">
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
              {actionTransaction?.groupKey && (
                <>
                  <dt>PnL</dt>
                  <dd
                    className={cn(
                      "text-right",
                      positionsByGroupPk[actionTransaction.groupKey.toBase58()]?.pnl > 0 && "text-mrgn-success",
                      positionsByGroupPk[actionTransaction.groupKey.toBase58()]?.pnl < 0 && "text-mrgn-error"
                    )}
                  >
                    {positionsByGroupPk[actionTransaction.groupKey.toBase58()]?.pnl > 0 && "+"}$
                    {dynamicNumeralFormatter(positionsByGroupPk[actionTransaction.groupKey.toBase58()]?.pnl ?? 0)}
                  </dd>
                </>
              )}
              {depositBanks.map((bank) => (
                <React.Fragment key={bank.meta.tokenSymbol}>
                  <dt>Supplied</dt>
                  <dd className="text-right">
                    {dynamicNumeralFormatter(bank.position.amount)} {bank.meta.tokenSymbol}
                  </dd>
                </React.Fragment>
              ))}

              {borrowBank && (
                <>
                  <dt>Borrowed</dt>
                  <dd className="text-right">
                    {dynamicNumeralFormatter(borrowBank.position.amount)} {borrowBank.meta.tokenSymbol}
                  </dd>
                </>
              )}

              {actionTransaction?.actionQuote?.priceImpactPct && (
                <>
                  <dt>Price impact</dt>
                  <dd className="text-right">
                    {percentFormatter.format(Number(actionTransaction.actionQuote.priceImpactPct))}
                  </dd>
                </>
              )}

              {actionTransaction?.actionQuote?.slippageBps && (
                <>
                  <dt>Slippage</dt>
                  <dd
                    className={cn(
                      actionTransaction.actionQuote.slippageBps > 500 && "text-alert-foreground",
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
            <DialogFooter className="flex flex-col sm:flex-col items-center gap-4">
              <Button
                variant="destructive"
                disabled={isLoading}
                className="w-full mx-auto"
                onClick={() => processTransaction()}
              >
                {isLoading ? <IconLoader2 className="animate-spin" /> : "Confirm close position"}
              </Button>

              <SharePosition pool={arenaPool} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ActionBoxProvider>
  );
};
