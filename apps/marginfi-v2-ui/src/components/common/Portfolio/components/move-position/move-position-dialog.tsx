import React from "react";

import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { v4 as uuidv4 } from "uuid";

import {
  usdFormatter,
  numeralFormatter,
  shortenAddress,
  percentFormatter,
  SolanaTransaction,
} from "@mrgnlabs/mrgn-common";
import { AccountSummary, ActiveBankInfo, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionMessageType,
  captureSentryException,
  checkLendActionAvailable,
  composeExplorerUrl,
  ExecuteMovePositionAction,
  ExecuteMovePositionActionProps,
  extractErrorString,
} from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "~/components/ui/select";
import { IconLoader } from "~/components/ui/icons";
import { useMoveSimulation } from "../../hooks";
import { ActionMessage, useActionContext } from "~/components";
import { IconArrowRight } from "@tabler/icons-react";
import { useUiStore } from "~/store";
import { toastManager } from "@mrgnlabs/mrgn-toasts";

interface MovePositionDialogProps {
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiAccounts: MarginfiAccountWrapper[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  bank: ActiveBankInfo;
  marginfiClient: MarginfiClient | null;
  fetchMrgnlendState: () => Promise<void>;
  extendedBankInfos: ExtendedBankInfo[];
  nativeSolBalance: number;
  accountSummary: AccountSummary | null;
  accountLabels?: Record<string, string>;
}

export const MovePositionDialog = ({
  selectedAccount,
  marginfiAccounts,
  isOpen,
  setIsOpen,
  bank,
  marginfiClient,
  fetchMrgnlendState,
  extendedBankInfos,
  nativeSolBalance,
  accountSummary,
  accountLabels,
}: MovePositionDialogProps) => {
  const [accountToMoveTo, setAccountToMoveTo] = React.useState<MarginfiAccountWrapper | null>(null);
  const [actionTxns, setActionTxns] = React.useState<SolanaTransaction[]>([]);
  const [isExecutionLoading, setIsExecutionLoading] = React.useState<boolean>(false);
  const [isSimulationLoading, setIsSimulationLoading] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<ActionMessageType | null>(null);
  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);
  const { handleSimulateTxns, actionSummary, setActionSummary } = useMoveSimulation({
    actionTxns,
    marginfiClient,
    accountToMoveTo,
    selectedAccount,
    activeBank: bank,
    extendedBankInfos,
    accountSummary,
    setActionTxns,
    setIsLoading: setIsSimulationLoading,
    setErrorMessage,
  });
  const { broadcastType, priorityFees } = useUiStore((state) => ({
    broadcastType: state.broadcastType,
    priorityFees: state.priorityFees,
  }));
  const [actionBlocked, setActionBlocked] = React.useState<boolean>(false);

  const actionMessages = React.useMemo(() => {
    if (bank.userInfo.maxWithdraw < bank.position.amount) {
      setErrorMessage({
        isEnabled: true,
        actionMethod: "ERROR",
        description: "Moving this position is blocked to prevent poor account health.",
      });
      setActionBlocked(true);
      return [];
    }

    setAdditionalActionMessages([]);
    const withdrawActionResult = checkLendActionAvailable({
      amount: bank.position.amount,
      connected: true,
      selectedBank: bank,
      nativeSolBalance: nativeSolBalance,
      banks: extendedBankInfos,
      lendMode: ActionType.Withdraw,
      marginfiAccount: selectedAccount,
    });

    const depositActionResult = checkLendActionAvailable({
      amount: bank.position.amount,
      connected: true,
      selectedBank: bank,
      nativeSolBalance: nativeSolBalance,
      banks: extendedBankInfos,
      lendMode: ActionType.Deposit,
      marginfiAccount: accountToMoveTo!,
    }).filter((result) => !/^Insufficient .* in wallet\.$/.test(result.description ?? ""));
    // filtering out insufficient balance messages since the user will always have enough balance after withdrawing

    return [...withdrawActionResult, ...depositActionResult];
  }, [bank, selectedAccount, extendedBankInfos, accountToMoveTo, nativeSolBalance]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      setAdditionalActionMessages([{ ...errorMessage, isEnabled: false }]);
    }
  }, [errorMessage]);

  const isButtonDisabled = React.useMemo(() => {
    if (!accountToMoveTo) return true;
    if (actionMessages && actionMessages.filter((value) => value.isEnabled === false).length > 0) return true;
    if (isSimulationLoading) return true;
    if (isExecutionLoading) return true;
    if (errorMessage?.isEnabled) return true;
    if (actionMessages.some((actionMessage) => actionMessage.actionMethod === "ERROR")) return true;
    return false;
  }, [accountToMoveTo, actionMessages, isSimulationLoading, isExecutionLoading, errorMessage]);

  const handleMovePosition = React.useCallback(async () => {
    if (!marginfiClient || !accountToMoveTo || !actionTxns || !broadcastType || !priorityFees) {
      console.error("Missing required props for ExecuteMovePositionAction");
      return;
    }

    const props: ExecuteMovePositionActionProps = {
      actionTxns: { transactions: actionTxns },
      attemptUuid: uuidv4(),
      marginfiClient,
      processOpts: { ...priorityFees, broadcastType },
      txOpts: {},
      infoProps: {
        originAccountAddress: shortenAddress(selectedAccount?.address.toBase58() ?? ""),
        destinationAccountAddress: shortenAddress(accountToMoveTo?.address.toBase58() ?? ""),
      },
      callbacks: {
        onComplete: () => {
          fetchMrgnlendState();
        },
      },
    };

    ExecuteMovePositionAction(props);
    setIsOpen(false);
  }, [
    marginfiClient,
    accountToMoveTo,
    actionTxns,
    broadcastType,
    priorityFees,
    selectedAccount,
    fetchMrgnlendState,
    setIsOpen,
  ]);

  React.useEffect(() => {
    if (!accountToMoveTo) return;
    handleSimulateTxns();
  }, [accountToMoveTo, handleSimulateTxns]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(value) => {
        setIsOpen(value);
        if (!value) {
          setTimeout(() => {
            setAccountToMoveTo(null);
            setActionTxns([]);
            setErrorMessage(null);
            setAdditionalActionMessages([]);
            setActionSummary(null);
          }, 100);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move position</DialogTitle>
          <DialogDescription>Move your position to another account</DialogDescription>
        </DialogHeader>

        <div className=" py-3 px-4 gap-4 flex flex-col ">
          <dl className="grid grid-cols-2 gap-y-0.5">
            <dt className="text-muted-foreground">Token value:</dt>
            <dd className="text-right text-white">
              {bank.position.amount < 0.01 ? "< $0.01" : numeralFormatter(bank.position.amount)}
              {" " + bank.meta.tokenSymbol}
            </dd>
            <dt className="text-muted-foreground">USD value</dt>
            <dd className="text-right text-white">
              {bank.position.usdValue < 0.01 ? "< $0.01" : usdFormatter.format(bank.position.usdValue)}
            </dd>
          </dl>
          {!actionBlocked && (
            <div className="flex justify-between w-full items-center">
              <span className="text-muted-foreground">Select account to move position to:</span>
              <Select
                onValueChange={(value) => {
                  setAccountToMoveTo(marginfiAccounts.find((account) => account.address.toBase58() === value) || null);
                }}
              >
                <SelectTrigger className="w-max">
                  {accountToMoveTo
                    ? accountLabels?.[accountToMoveTo?.address.toBase58()]
                      ? accountLabels[accountToMoveTo?.address.toBase58()]
                      : `Account ${
                          marginfiAccounts.findIndex(
                            (acc) => acc.address.toBase58() === accountToMoveTo?.address.toBase58()
                          ) + 1
                        }`
                    : "Select account"}
                </SelectTrigger>
                <SelectContent>
                  {marginfiAccounts
                    ?.filter((acc) => acc.address.toBase58() !== selectedAccount?.address.toBase58())
                    .map((account, i) => (
                      <SelectItem key={i} value={account.address.toBase58()}>
                        {accountLabels?.[account.address.toBase58()]
                          ? accountLabels[account.address.toBase58()]
                          : `Account ${
                              marginfiAccounts.findIndex(
                                (_acc) => _acc.address.toBase58() === account?.address.toBase58()
                              ) + 1
                            }`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {actionSummary && (
            <dl className="grid grid-cols-2 gap-y-2 ">
              <dt className="text-muted-foreground">Health:</dt>
              <dd
                className={`flex justify-end text-right items-center gap-2 text-right  ${
                  actionSummary.health >= 0.5
                    ? "text-success"
                    : actionSummary.health >= 0.25
                      ? "text-alert-foreground"
                      : "text-destructive-foreground"
                }`}
              >
                <>
                  {accountSummary?.healthFactor && percentFormatter.format(accountSummary?.healthFactor.computedHealth)}
                  <IconArrowRight width={12} height={12} />
                  {percentFormatter.format(actionSummary.health)}
                </>
              </dd>
            </dl>
          )}
        </div>
        {additionalActionMessages.concat(actionMessages).map(
          (actionMessage, idx) =>
            actionMessage.description && (
              <div key={idx}>
                <ActionMessage actionMessage={actionMessage} />
              </div>
            )
        )}

        <Button className="w-full" onClick={handleMovePosition} disabled={isButtonDisabled}>
          {isExecutionLoading || isSimulationLoading ? <IconLoader /> : "Move position"}
        </Button>

        <div className=" text-xs text-muted-foreground text-center">
          The transaction will show no balance changes. The position will be moved between marginfi accounts owned by
          the same wallet.
        </div>
      </DialogContent>
    </Dialog>
  );
};
