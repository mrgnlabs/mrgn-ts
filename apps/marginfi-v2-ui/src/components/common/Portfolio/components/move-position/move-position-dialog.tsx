import React from "react";

import Image from "next/image";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";

import { usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { checkLendActionAvailable, MultiStepToastHandle } from "@mrgnlabs/mrgn-utils";
import { makeBundleTipIx, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "~/components/ui/select";
import { IconLoader } from "~/components/ui/icons";
import { useMoveSimulation } from "../../hooks";
import { ActionMessage } from "~/components";

export const MovePositionDialog = ({
  selectedAccount,
  marginfiAccounts,
  isOpen,
  setIsOpen,
  bank,
  marginfiClient,
  fetchMrgnlendState,
  extendedBankInfos,
}: {
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiAccounts: MarginfiAccountWrapper[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  bank: ActiveBankInfo;
  marginfiClient: MarginfiClient | null;
  fetchMrgnlendState: () => void;
  extendedBankInfos: ExtendedBankInfo[];
}) => {
  const [accountToMoveTo, setAccountToMoveTo] = React.useState<MarginfiAccountWrapper | undefined>(undefined);
  const [actionTxns, setActionTxns] = React.useState<VersionedTransaction[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const { handleSimulateTxns } = useMoveSimulation({
    actionTxns,
    marginfiClient,
    accountToMoveTo,
    selectedAccount,
    activeBank: bank,
    extendedBankInfos,
    setActionTxns,
    setIsLoading,
  });

  const actionMethods = React.useMemo(() => {
    const withdrawActionResult = checkLendActionAvailable({
      amount: bank.position.amount,
      connected: true,
      selectedBank: bank,
      nativeSolBalance: 0,
      banks: extendedBankInfos,
      lendMode: ActionType.Withdraw,
      marginfiAccount: selectedAccount,
    });

    const depositActionResult = checkLendActionAvailable({
      amount: bank.position.amount,
      connected: true,
      selectedBank: bank,
      nativeSolBalance: 0,
      banks: extendedBankInfos,
      lendMode: ActionType.Deposit,
      marginfiAccount: accountToMoveTo!,
    });

    return [...withdrawActionResult, ...depositActionResult];
  }, [bank, selectedAccount, extendedBankInfos, accountToMoveTo]);

  const isButtonDisabled = React.useMemo(() => {
    if (!accountToMoveTo) return true;
    if (actionMethods && actionMethods.filter((value) => value.isEnabled === false).length > 0) return true;
    if (isLoading) return true;
    return false;
  }, [accountToMoveTo, actionMethods, isLoading]);

  const handleMovePosition = React.useCallback(async () => {
    if (!marginfiClient || !accountToMoveTo || !actionTxns) {
      return;
    }

    const multiStepToast = new MultiStepToastHandle("Moving position", [
      {
        label: `Moving to account ${`${accountToMoveTo?.address.toBase58().slice(0, 8)}
          ...${accountToMoveTo?.address.toBase58().slice(-8)}`}`,
      },
    ]);
    multiStepToast.start();
    setIsLoading(true);
    try {
      await marginfiClient.processTransactions(actionTxns);
      await fetchMrgnlendState();
      multiStepToast.setSuccessAndNext();
      setIsOpen(false);
    } catch (error) {
      console.error("Error moving position between accounts", error);
      multiStepToast.setFailed("Error moving position between accounts"); // TODO: update
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marginfiClient, accountToMoveTo, selectedAccount, bank]);

  React.useEffect(() => {
    if (!accountToMoveTo) return;
    handleSimulateTxns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountToMoveTo]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(value) => {
        setIsOpen(value);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move position to another account</DialogTitle>
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
          <div className="flex justify-between w-full items-center">
            <span className="text-muted-foreground">Select account to move position to:</span>
            <Select
              onValueChange={(value) => {
                setAccountToMoveTo(marginfiAccounts.find((account) => account.address.toBase58() === value));
              }}
            >
              <SelectTrigger className="w-max">
                {accountToMoveTo
                  ? `Account 
                  ${
                    marginfiAccounts.findIndex(
                      (account) => account.address.toBase58() === accountToMoveTo?.address.toBase58()
                    ) + 1
                  }`
                  : "Select account"}
              </SelectTrigger>
              <SelectContent>
                {marginfiAccounts
                  ?.filter((acc) => acc.address.toBase58() !== selectedAccount?.address.toBase58())
                  .map((account, i) => (
                    <SelectItem key={i} value={account.address.toBase58()}>
                      Account{" "}
                      {marginfiAccounts.findIndex((_acc) => _acc.address.toBase58() === account?.address.toBase58()) +
                        1}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {accountToMoveTo && (
            <div className="flex justify-between w-full items-center">
              <span className="text-muted-foreground">Account address:</span>
              <div className="flex gap-1 items-center">
                <span className="text-muted-foreground ">
                  {`${accountToMoveTo?.address.toBase58().slice(0, 8)}
                    ...${accountToMoveTo?.address.toBase58().slice(-8)}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {actionMethods.map(
          (actionMethod, idx) =>
            actionMethod.description && (
              <div className="pb-6" key={idx}>
                <ActionMessage actionMethod={actionMethod} />
              </div>
            )
        )}

        <Button className="w-full" onClick={handleMovePosition} disabled={isButtonDisabled}>
          {isLoading ? <IconLoader /> : "Move position"}
        </Button>

        <div className=" text-xs text-muted-foreground text-center">
          The transaction will look like there are no balance changes for this position. The position/funds will be
          moved between marginfi accounts, but will remain on the same wallet.
        </div>
      </DialogContent>
    </Dialog>
  );
};
