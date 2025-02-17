import React from "react";

import { IconX } from "@tabler/icons-react";
import {
  capture,
  ClosePositionActionTxns,
  ExecuteClosePositionActionProps,
  extractErrorString,
  IndividualFlowError,
  MultiStepToastHandle,
} from "@mrgnlabs/mrgn-utils";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { Button } from "~/components/ui/button";
import { ArenaBank, ArenaPoolPositions, ArenaPoolV2Extended } from "~/types/trade-store.types";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { useArenaClient } from "~/hooks/useArenaClient";
import { useConnection } from "~/hooks/use-connection";
import { useTradeStoreV2, useUiStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks";
import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";
import { usePositionsData } from "~/hooks/usePositionsData";

import { ClosePositionDialog } from "./components/close-position-dialog";
import { handleExecuteClosePositionAction, simulateClosePosition } from "./utils/close-position-utils";
import { PreviousTxn } from "~/types";

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

  const client = useArenaClient({ groupPk: arenaPool.groupPk });
  const { wrappedAccount } = useWrappedAccount({
    client,
    groupPk: arenaPool.groupPk,
    banks: [arenaPool.tokenBank, arenaPool.quoteBank],
  });
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const [platformFeeBps, broadcastType, priorityFees, setIsActionComplete, setPreviousTxn, jupiterOptions] = useUiStore(
    (state) => [
      state.platformFeeBps,
      state.broadcastType,
      state.priorityFees,
      state.setIsActionComplete,
      state.setPreviousTxn,
      state.jupiterOptions,
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
    try {
      const { actionTxns, actionMessage } = await simulateClosePosition({
        marginfiAccount: wrappedAccount,
        depositBanks: depositBanks as ActiveBankInfo[],
        borrowBank: borrowBank as ActiveBankInfo | null,
        jupiterOptions: jupiterOptions,
        connection: connection,
        platformFeeBps: platformFeeBps,
        tradeState: arenaPool.status,
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
      setMultiStepToast(multiStepToast);
      setIsLoading(false);
    }
  }, [wrappedAccount, connection, depositBanks, borrowBank, jupiterOptions, platformFeeBps, arenaPool]);

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

  ////////////////////////////
  // Close Position Actions //
  ////////////////////////////
  const executeAction = async (
    params: ExecuteClosePositionActionProps,
    arenaPool: ArenaPoolV2Extended,
    callbacks: {
      captureEvent: (event: string, properties?: Record<string, any>) => void;
      setIsLoading: (loading: boolean) => void;
      retryCallback: (txns: ClosePositionActionTxns, multiStepToast: MultiStepToastHandle) => void;
      handleOnComplete: (txnSigs: string[]) => void;
    }
  ) => {
    const action = async (params: any) => {
      handleExecuteClosePositionAction({
        params,
        arenaPool,
        captureEvent: (event, properties) => {
          callbacks.captureEvent && callbacks.captureEvent(event, properties);
        },
        setIsLoading: callbacks.setIsLoading,
        setIsComplete: callbacks.handleOnComplete,

        setError: (error: IndividualFlowError) => {
          const toast = error.multiStepToast as MultiStepToastHandle;
          const txs = error.actionTxns as ClosePositionActionTxns;
          const errorMessage = error.message;
          let retry = undefined;
          if (error.retry && toast && txs) {
            retry = () => callbacks.retryCallback(txs, toast);
          }
          toast.setFailed(errorMessage, retry);
          callbacks.setIsLoading(false);
        },
      });
    };

    await action(params);
  };

  const retryClosePositionAction = React.useCallback(
    async (
      params: ExecuteClosePositionActionProps,
      pnl: number,
      entryPrice: number,
      arenaPool: ArenaPoolV2Extended
    ) => {
      executeAction(params, arenaPool, {
        captureEvent: capture,
        setIsLoading: setIsLoading,
        retryCallback: (txns: ClosePositionActionTxns, multiStepToast: MultiStepToastHandle) => {
          retryClosePositionAction({ ...params, actionTxns: txns, multiStepToast }, pnl, entryPrice, arenaPool);
        },
        handleOnComplete: (txnSigs: string[]) => {
          setIsActionComplete(true);
          setPreviousTxn({
            txnType: "CLOSE_POSITION",
            txn: txnSigs[txnSigs.length - 1],
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
          refreshGroup({
            groupPk: arenaPool.groupPk,
            banks: [arenaPool.tokenBank.address, arenaPool.quoteBank.address],
            connection,
            wallet,
          });
          setIsOpen(false);
          console.log("handleOnComplete in close-position.tsx");
        },
      });
    },
    [setIsActionComplete, setPreviousTxn, positionSizeUsd, leverage, refreshGroup, connection, wallet]
  );

  const handleClosePositionAction = React.useCallback(async () => {
    if (!actionTxns || !client || !multiStepToast || !arenaPool) {
      return;
    }
    const pnl = positionData && positionData.pnl ? positionData.pnl : 0;
    const entryPrice = positionData && positionData.entryPrice ? positionData.entryPrice : 0;

    const params = {
      marginfiClient: client,
      actionTxns: actionTxns,
      processOpts: {
        broadcastType: broadcastType,
        ...priorityFees,
      },
      txOpts: {},
      multiStepToast: multiStepToast,
      marginfiAccount: wrappedAccount,
    } as ExecuteClosePositionActionProps;

    return await executeAction(params, arenaPool, {
      captureEvent: capture,
      setIsLoading: setIsLoading,
      handleOnComplete: (txnSigs: string[]) => {
        setIsActionComplete(true);
        setPreviousTxn({
          txnType: "CLOSE_POSITION",
          txn: txnSigs[txnSigs.length - 1],
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
        refreshGroup({
          groupPk: arenaPool.groupPk,
          banks: [arenaPool.tokenBank.address, arenaPool.quoteBank.address],
          connection,
          wallet,
        });
        setIsOpen(false);
      },
      retryCallback: (txns: ClosePositionActionTxns, multiStepToast: MultiStepToastHandle) => {
        retryClosePositionAction({ ...params, actionTxns: txns, multiStepToast }, pnl, entryPrice, arenaPool);
      },
    });
  }, [
    actionTxns,
    client,
    multiStepToast,
    arenaPool,
    positionData,
    broadcastType,
    priorityFees,
    wrappedAccount,
    setIsActionComplete,
    setPreviousTxn,
    positionSizeUsd,
    leverage,
    refreshGroup,
    connection,
    wallet,
    retryClosePositionAction,
  ]);

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
        handleClosePosition={handleClosePositionAction}
        isLoading={isLoading}
        pnl={positionData?.pnl ?? 0}
      />
    </>
  );
};
