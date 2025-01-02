import React from "react";

import { IconX } from "@tabler/icons-react";
import {
  capture,
  ClosePositionActionTxns,
  composeExplorerUrl,
  extractErrorString,
  MultiStepToastHandle,
} from "@mrgnlabs/mrgn-utils";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { Button } from "~/components/ui/button";
import { ArenaBank, ArenaPoolPositions, ArenaPoolV2Extended } from "~/types/trade-store.types";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useConnection } from "~/hooks/use-connection";
import { useTradeStoreV2, useUiStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks";
import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";
import { usePositionsData } from "~/hooks/usePositionsData";
import { ClosePositionDialog } from "./components/close-position-dialog";
import { closePositionAction, fetchTransactionsAction } from "./utils/close-position-utils";
interface ClosePositionProps {
  arenaPool: ArenaPoolV2Extended;
  positionsByGroupPk: Record<string, ArenaPoolPositions>;
  depositBanks: ArenaBank[];
  borrowBank: ArenaBank | null;
}

export const ClosePosition = ({ arenaPool, positionsByGroupPk, depositBanks, borrowBank }: ClosePositionProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [multiStepToast, setMultiStepToast] = React.useState<MultiStepToastHandle | null>(null);
  const [actionTxns, setActionTxns] = React.useState<ClosePositionActionTxns | null>(null);

  const client = useMarginfiClient({ groupPk: arenaPool.groupPk });
  const { wrappedAccount } = useWrappedAccount({
    client,
    groupPk: arenaPool.groupPk,
    banks: [arenaPool.tokenBank, arenaPool.quoteBank],
  });
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const [slippageBps, platformFeeBps, broadcastType, priorityFees, setIsActionComplete, setPreviousTxn] = useUiStore(
    (state) => [
      state.slippageBps,
      state.platformFeeBps,
      state.broadcastType,
      state.priorityFees,
      state.setIsActionComplete,
      state.setPreviousTxn,
    ]
  );
  const [refreshGroup] = useTradeStoreV2((state) => [state.refreshGroup]);
  const { positionSizeUsd, leverage } = useLeveragedPositionDetails({
    pool: arenaPool,
  });
  const positionData = usePositionsData({ groupPk: arenaPool.groupPk });

  const handleSimulation = React.useCallback(async () => {
    if (!wrappedAccount || !connection) {
      return;
    }
    const multiStepToast = new MultiStepToastHandle("Closing position", [
      { label: "Loading details..." },
      { label: "Signing transaction" },
      {
        label: `Closing ${depositBanks[0].meta.tokenSymbol}${
          borrowBank ? "/" + borrowBank?.meta.tokenSymbol : ""
        } position.`,
      },
    ]);
    multiStepToast.start();
    setMultiStepToast(multiStepToast);
    try {
      const { actionTxns, actionMessage } = await fetchTransactionsAction({
        marginfiAccount: wrappedAccount,
        depositBanks: depositBanks as ActiveBankInfo[],
        borrowBank: borrowBank as ActiveBankInfo | null,
        slippageBps: slippageBps,
        connection: connection,
        platformFeeBps: platformFeeBps,
        setIsLoading,
      });

      if (actionMessage || actionTxns === null) {
        multiStepToast.setFailed(actionMessage?.description ?? "Error simulating transaction");
        return;
      }

      multiStepToast.setSuccessAndNext();
      multiStepToast.pause();

      setActionTxns(actionTxns);
      setIsOpen(true);
    } catch (error) {
      console.error("Error simulating transaction", error);
      const msg = extractErrorString(error);
      multiStepToast.setFailed(msg ?? "Error simulating transaction");
      setActionTxns(null);
    } finally {
      setIsLoading(false);
    }
  }, [wrappedAccount, connection, depositBanks, borrowBank, slippageBps, platformFeeBps]);

  const handleCompleteAction = React.useCallback(
    (txnSig: string, pnl: number, entryPrice: number) => {
      setIsOpen(false);
      refreshGroup({
        groupPk: arenaPool.groupPk,
        banks: [arenaPool.tokenBank.address, arenaPool.quoteBank.address],
        connection,
        wallet,
      });
      setIsActionComplete(true);
      setIsActionComplete(true);
      setPreviousTxn({
        txnType: "CLOSE_POSITION",
        txn: Array.isArray(txnSig) ? txnSig[txnSig.length - 1] : txnSig!,
        positionClosedOptions: {
          tokenBank: arenaPool.tokenBank,
          size: positionSizeUsd,
          leverage: Number(leverage),
          entryPrice: entryPrice,
          exitPrice: arenaPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber(),
          pnl: pnl,
          pool: arenaPool,
        },
      });
      capture("close_position", {
        group: arenaPool.groupPk?.toBase58(),
        txnSig: txnSig,
        token: arenaPool.tokenBank.meta.tokenSymbol,
        tokenSize: arenaPool.tokenBank.isActive ? arenaPool.tokenBank.position.amount : 0,
        usdcSize: arenaPool.quoteBank.isActive ? arenaPool.quoteBank.position.amount : 0,
      });
    },
    [refreshGroup, arenaPool, connection, wallet, setIsActionComplete, setPreviousTxn, positionSizeUsd, leverage] // TODO: eslint
  );
  const handleClosePosition = React.useCallback(async () => {
    if (!actionTxns || !client || !multiStepToast || !wrappedAccount) {
      return;
    }
    const pnl = positionData && positionData.pnl ? positionData.pnl : 0;
    const entryPrice = positionData && positionData.entryPrice ? positionData.entryPrice : 0;

    multiStepToast.resume();
    setIsLoading(true);

    try {
      const { txnSig, actionMessage } = await closePositionAction({
        marginfiClient: client,
        actionTransaction: actionTxns,
        broadcastType: broadcastType,
        priorityFees: priorityFees,
        multiStepToast: multiStepToast,
      });

      if (actionMessage || !txnSig) {
        multiStepToast.setFailed(actionMessage?.description ?? "Error closing position");
        return;
      }

      multiStepToast.setSuccess(txnSig, composeExplorerUrl(txnSig, broadcastType, client.processTransactionStrategy));
      handleCompleteAction(txnSig, pnl, entryPrice);
    } catch (error) {
      console.error("Error closing position", error);
      const msg = extractErrorString(error);
      multiStepToast.setFailed(msg ?? "Error closing position");
    } finally {
      setIsLoading(false);
    }
  }, [
    actionTxns,
    client,
    multiStepToast,
    wrappedAccount,
    positionData,
    broadcastType,
    priorityFees,
    handleCompleteAction,
  ]); // TODO: eslint

  const handleChangeDialogState = (open: boolean) => {
    setIsOpen(open);
    setActionTxns(null);
  };

  const hasBeenOpened = React.useRef(false);

  React.useEffect(() => {
    if (isOpen) {
      hasBeenOpened.current = true;
    } else if (hasBeenOpened.current && multiStepToast) {
      const timeout = setTimeout(() => {
        multiStepToast.close();
        hasBeenOpened.current = false;
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isOpen, multiStepToast]);

  return (
    <>
      <Button onClick={handleSimulation} disabled={false} variant="destructive" size="sm" className="gap-1 min-w-16">
        <IconX size={14} />
        Close
      </Button>
      <ClosePositionDialog
        arenaPool={arenaPool}
        actionTransaction={actionTxns}
        positionsByGroupPk={positionsByGroupPk}
        depositBanks={depositBanks}
        borrowBank={borrowBank}
        isOpen={isOpen}
        onOpenChange={handleChangeDialogState}
        handleClosePosition={handleClosePosition}
        isLoading={isLoading}
        pnl={positionData?.pnl ?? 0}
      />
    </>
  );
};
