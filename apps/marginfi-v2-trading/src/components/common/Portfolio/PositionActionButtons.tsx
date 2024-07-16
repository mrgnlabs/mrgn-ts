import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo, ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconMinus, IconX, IconPlus } from "@tabler/icons-react";

import { cn, extractErrorString } from "~/utils";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";
import { getCloseTransaction } from "../TradingBox/tradingBox.utils";
import React from "react";
import { useConnection } from "~/hooks/useConnection";
import { useUiStore } from "~/store";
import { MultiStepToastHandle } from "~/utils/toastUtils";
import { ActiveGroup } from "~/store/tradeStore";

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
    if (!marginfiAccount || !collateralBank || !marginfiClient) return;

    const multiStepToast = new MultiStepToastHandle("Closing position", [
      { label: `Closing borrow and supplied positions.` },
    ]);

    multiStepToast.start();

    try {
      const txn = await getCloseTransaction({
        marginfiAccount,
        borrowBank: borrowBank,
        depositBanks: depositBanks,
        slippageBps,
        connection: connection,
        priorityFee,
      });
      if (!txn) {
        throw new Error("Something went wrong.");
      }

      const txnSig = await marginfiClient.processTransaction(txn);
      multiStepToast.setSuccessAndNext();
      return txnSig;
    } catch (error: any) {
      const msg = extractErrorString(error);

      multiStepToast.setFailed(msg);
      console.log(`Error while borrowing: ${msg}`);
      console.log(error);
      return;
    }
  }, [marginfiAccount, collateralBank, marginfiClient, borrowBank, depositBanks, slippageBps, connection, priorityFee]);

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
