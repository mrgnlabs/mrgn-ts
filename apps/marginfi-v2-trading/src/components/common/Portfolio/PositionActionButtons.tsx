import React from "react";
import { MarginfiAccountWrapper, MarginfiClient, getConfig } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo, ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconMinus, IconX, IconPlus } from "@tabler/icons-react";

import { useConnection } from "~/hooks/useConnection";
import { useTradeStore, useUiStore } from "~/store";
import { ActiveGroup } from "~/store/tradeStore";
import { useWalletContext } from "~/hooks/useWalletContext";
import { cn, extractErrorString } from "~/utils";
import { MultiStepToastHandle } from "~/utils/toastUtils";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";

import { getCloseTransaction } from "../TradingBox/tradingBox.utils";
import { PublicKey, Transaction } from "@solana/web3.js";

type PositionActionButtonsProps = {
  marginfiClient: MarginfiClient | null;
  marginfiAccount?: MarginfiAccountWrapper;
  isBorrowing: boolean;
  bank: ActiveBankInfo;
  collateralBank?: ExtendedBankInfo | null;
  rightAlignFinalButton?: boolean;
  activeGroup?: ActiveGroup;
};

export const PositionActionButtons = ({
  marginfiClient,
  marginfiAccount,
  isBorrowing,
  bank,
  collateralBank = null,
  rightAlignFinalButton = false,
  activeGroup,
}: PositionActionButtonsProps) => {
  const { connection } = useConnection();
  const { wallet } = useWalletContext();
  const [platformFeeBps] = useUiStore((state) => [state.platformFeeBps]);
  const [groupsCache, setIsRefreshingStore, fetchTradeState] = useTradeStore((state) => [
    state.groupsCache,
    state.setIsRefreshingStore,
    state.fetchTradeState,
  ]);
  const [slippageBps, priorityFee] = useUiStore((state) => [state.slippageBps, state.priorityFee]);

  const depositBanks = React.useMemo(() => {
    let banks = [];

    if (collateralBank && collateralBank.isActive && collateralBank.position.isLending) banks.push(collateralBank);
    if (bank.isActive && bank.position.isLending) banks.push(bank);
    return banks;
  }, [bank, collateralBank]);

  const borrowBank = React.useMemo(() => {
    if (collateralBank && collateralBank.isActive && !collateralBank.position.isLending) return collateralBank;
    if (bank.isActive && !bank.position.isLending) return bank;
    return null;
  }, [bank, collateralBank]);

  const closeTransaction = React.useCallback(async () => {
    console.log({ marginfiAccount, collateralBank, marginfiClient });
    if (!marginfiAccount || !collateralBank) return;

    let client = marginfiClient;
    const multiStepToast = new MultiStepToastHandle("Closing position", [
      {
        label: `Closing ${bank.meta.tokenSymbol}${
          collateralBank ? "/" + collateralBank?.meta.tokenSymbol : ""
        } position.`,
      },
    ]);

    multiStepToast.start();

    try {
      if (!marginfiClient) {
        const { programId } = getConfig();
        const group = new PublicKey(collateralBank.info.rawBank.group);
        const bankKeys = groupsCache[group.toBase58()].map((bank) => new PublicKey(bank));
        client = await MarginfiClient.fetch(
          {
            environment: "production",
            cluster: "mainnet",
            programId,
            groupPk: group,
          },
          wallet,
          connection,
          {
            preloadedBankAddresses: bankKeys,
          }
        );
      }

      if (!client) {
        throw new Error("Invalid client");
      }

      const txns = await getCloseTransaction({
        marginfiAccount,
        borrowBank: borrowBank,
        depositBanks: depositBanks,
        slippageBps,
        connection: connection,
        priorityFee,
        platformFeeBps,
      });

      if (!txns) {
        throw new Error("Something went wrong.");
      }

      let txnSig: string | string[];

      if (txns instanceof Transaction) {
        txnSig = await client.processTransaction(txns);
        multiStepToast.setSuccessAndNext();
      } else {
        txnSig = await client.processTransactions([
          ...(txns.bundleTipTxn ? [txns.bundleTipTxn] : []),
          txns.flashloanTx,
        ]);
        multiStepToast.setSuccessAndNext();
      }

      // -------- Refresh state
      try {
        setIsRefreshingStore(true);
        await fetchTradeState({
          connection,
          wallet,
          refresh: true,
        });
      } catch (error: any) {
        console.log("Error while reloading state");
        console.log(error);
      }
      return txnSig;
    } catch (error: any) {
      const msg = extractErrorString(error);

      multiStepToast.setFailed(msg);
      console.log(`Error while closing: ${msg}`);
      console.log(error);
      return;
    }
  }, [
    marginfiAccount,
    collateralBank,
    marginfiClient,
    bank.meta.tokenSymbol,
    borrowBank,
    depositBanks,
    slippageBps,
    connection,
    priorityFee,
    platformFeeBps,
    groupsCache,
    wallet,
    setIsRefreshingStore,
    fetchTradeState,
  ]);

  return (
    <div className="flex gap-3 w-full">
      <ActionBoxDialog
        requestedBank={bank.position.isLending ? bank : collateralBank}
        requestedAction={ActionType.Deposit}
        requestedAccount={marginfiAccount}
        activeGroupArg={activeGroup}
      >
        <Button size="sm" className="gap-1 min-w-16">
          <IconPlus size={14} />
          Add
        </Button>
      </ActionBoxDialog>
      {collateralBank && isBorrowing && (
        <ActionBoxDialog
          requestedBank={bank.position.isLending ? collateralBank : bank}
          requestedAction={ActionType.Repay}
          requestedAccount={marginfiAccount}
          activeGroupArg={activeGroup}
        >
          <Button size="sm" className="gap-1 min-w-16">
            <IconMinus size={14} />
            Reduce
          </Button>
        </ActionBoxDialog>
      )}
      {!isBorrowing && (
        <ActionBoxDialog
          activeGroupArg={activeGroup}
          requestedBank={
            bank.position.isLending ? (collateralBank && collateralBank.isActive ? collateralBank : bank) : bank
          }
          requestedAction={ActionType.Withdraw}
          requestedAccount={marginfiAccount}
          requestedCollateralBank={
            bank.position.isLending
              ? collateralBank && collateralBank.isActive
                ? bank
                : collateralBank || undefined
              : collateralBank || undefined
          }
        >
          <Button size="sm" className="gap-1 min-w-16">
            <IconMinus size={14} />
            Withdraw
          </Button>
        </ActionBoxDialog>
      )}
      <Button
        onClick={() => closeTransaction()}
        variant="destructive"
        size="sm"
        className={cn("gap-1 min-w-16", rightAlignFinalButton && "ml-auto")}
      >
        <IconX size={14} />
        Close
      </Button>
    </div>
  );
};
