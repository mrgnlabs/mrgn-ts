import React from "react";

import { IconX } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { ClosePositionDialog } from "./components/close-position-dialog";
import { ClosePositionActionTxns, extractErrorString, MultiStepToastHandle } from "@mrgnlabs/mrgn-utils";
import { ArenaBank, ArenaPoolPositions, ArenaPoolV2Extended } from "~/types/trade-store.types";
import { ActionMessageType, cn } from "@mrgnlabs/mrgn-utils";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { closePositionAction, fetchTransactionsAction } from "./utils/close-position-utils";
import { useConnection } from "~/hooks/use-connection";
import { useUiStore } from "~/store";

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

  const [slippageBps, platformFeeBps, broadcastType, priorityFees] = useUiStore((state) => [
    state.slippageBps,
    state.platformFeeBps,
    state.broadcastType,
    state.priorityFees,
  ]);

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
        setMultiStepToast,
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

  const handleClosePosition = React.useCallback(async () => {
    if (!actionTxns || !client || !multiStepToast || !wrappedAccount) {
      return;
    }
    multiStepToast.resume();

    try {
      const { txnSig, actionMessage } = await closePositionAction({
        marginfiClient: client,
        actionTransaction: actionTxns,
        broadcastType: broadcastType,
        priorityFees: priorityFees,
      });

      if (actionMessage || !txnSig) {
        multiStepToast.setFailed(actionMessage?.description ?? "Error closing position");
        return;
      }

      multiStepToast.setSuccessAndNext();
    } catch (error) {
      console.error("Error closing position", error);
      const msg = extractErrorString(error);
      multiStepToast.setFailed(msg ?? "Error closing position");
    }
  }, [actionTxns, client, multiStepToast, wrappedAccount, broadcastType, priorityFees]);

  const handleChangeDialogState = (open: boolean) => {
    setIsOpen(open);
    setActionTxns(null);
  };

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
      />
    </>
  );
};
