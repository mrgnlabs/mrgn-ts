import React from "react";

import Image from "next/image";

import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { capture, MultiStepToastHandle } from "@mrgnlabs/mrgn-utils";
import { ActionBox } from "@mrgnlabs/mrgn-ui";
import { makeBundleTipIx, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { cn } from "@mrgnlabs/mrgn-utils";
import { useAssetItemData } from "~/hooks/useAssetItemData";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { useMrgnlendStore, useUiStore } from "~/store";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "~/components/ui/select";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { IconLoader } from "~/components/ui/icons";

interface PortfolioAssetCardProps {
  bank: ActiveBankInfo;
  isInLendingMode: boolean;
  isBorrower?: boolean;
}

export const PortfolioAssetCard = ({ bank, isInLendingMode, isBorrower = true }: PortfolioAssetCardProps) => {
  const { rateAP } = useAssetItemData({ bank, isInLendingMode });
  const [selectedAccount, marginfiAccounts, marginfiClient, fetchMrgnlendState] = useMrgnlendStore((state) => [
    state.selectedAccount,
    state.marginfiAccounts,
    state.marginfiClient,
    state.fetchMrgnlendState,
  ]);
  const isIsolated = React.useMemo(() => bank.info.state.isIsolated, [bank]);

  const isUserPositionPoorHealth = React.useMemo(() => {
    if (!bank || !bank?.position?.liquidationPrice) {
      return false;
    }

    const alertRange = 0.05;

    if (bank.position.isLending) {
      return bank.info.state.price < bank.position.liquidationPrice + bank.position.liquidationPrice * alertRange;
    } else {
      return bank.info.state.price > bank.position.liquidationPrice - bank.position.liquidationPrice * alertRange;
    }
  }, [bank]);

  const [isMovePositionDialogOpen, setIsMovePositionDialogOpen] = React.useState<boolean>(false);
  const postionMovingPossible = React.useMemo(() => marginfiAccounts.length > 1, marginfiAccounts);
  return (
    <Accordion type="single" collapsible>
      <AccordionItem
        value="key-1"
        className="bg-background-gray transition rounded-xl px-3 data-[state=closed]:hover:bg-background-gray-light"
      >
        <AccordionTrigger
          variant="portfolio"
          className="hover:no-underline outline-none py-3 [&[data-state=open]>div>div>#health-label]:opacity-0 [&[data-state=open]>div>div>#health-label]:mb-[-24px]"
        >
          <div className="w-full space-y-1 ">
            <div className="flex justify-between items-center w-full gap-2">
              <div className="flex text-left gap-3">
                <div className="flex items-center">
                  <Image
                    src={bank.meta.tokenLogoUri}
                    className="rounded-full"
                    alt={bank.meta.tokenSymbol}
                    height={40}
                    width={40}
                  />
                </div>
                <dl>
                  <dt className="font-medium text-lg">{bank.meta.tokenSymbol}</dt>
                  <dd className={cn("text-sm font-normal", isInLendingMode ? "text-success" : "text-warning")}>
                    {rateAP.concat(...[" ", "APY"])}
                  </dd>
                </dl>
              </div>
              <div className="font-medium text-lg mr-2">
                {/* {bank.position.amount < 0.01
                  ? "< $0.01"
                  : dynamicNumeralFormatter(bank.position.amount, {
                      tokenPrice: bank.info.oraclePrice.priceRealtime.price.toNumber(),
                    })} */}
                {dynamicNumeralFormatter(0.002466, {
                  tokenPrice: 75000,
                })}
                {" " + bank.meta.tokenSymbol}
              </div>
            </div>
            <div className="flex flex-row w-full gap-2">
              {isIsolated && (
                <div className="flex w-fit text-muted-foreground bg-muted items-center rounded-3xl px-3 py-1 mt-4 text-xs">
                  <span>Isolated pool</span>
                </div>
              )}
              {isUserPositionPoorHealth && isBorrower && (
                <div
                  id="health-label"
                  className={cn(
                    "flex w-fit text-destructive-foreground bg-destructive items-center rounded-3xl px-3 py-1 mt-4 text-xs",
                    "transition-all duration-500 ease-in-out gap-1.5"
                  )}
                >
                  <IconAlertTriangle width={"12px"} height={"12px"} />
                  <span>Liquidation risk</span>
                </div>
              )}
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent
          className="flex flex-col gap-3"
          contentClassName="[&[data-state=open]>div>#health-label]:opacity-100"
        >
          {isUserPositionPoorHealth && isBorrower && (
            <div
              id="health-label"
              className="flex flex-row gap-2 opacity-0 w-full transition-opacity duration-2000 ease-in bg-destructive text-destructive-foreground text-sm p-2.5 rounded-xl"
            >
              <IconAlertTriangle width={"16px"} height={"16px"} />
              <div className="flex flex-col ">
                <span>Liquidation risk</span>
                <p>You need to add more collateral in order to sustain this position</p>
              </div>
            </div>
          )}
          <div className="bg-background/60 py-3 px-4 rounded-lg">
            <dl className="grid grid-cols-2 gap-y-0.5">
              <dt className="text-muted-foreground">USD value</dt>
              <dd className="text-right text-white">
                {bank.position.usdValue < 0.01 ? "< $0.01" : usdFormatter.format(bank.position.usdValue)}
              </dd>
              <dt className="text-muted-foreground">Current price</dt>
              <dd className="text-right text-white">{usdFormatter.format(bank.info.state.price)}</dd>
              {bank.position.liquidationPrice && (
                <>
                  <dt className="text-muted-foreground">Liquidation price</dt>
                  <dd
                    className={cn(
                      "justify-end flex items-center gap-1",
                      isUserPositionPoorHealth ? "text-error" : "text-white"
                    )}
                  >
                    {isUserPositionPoorHealth && <IconAlertTriangle width={"16px"} height={"16px"} />}
                    {bank.position.liquidationPrice > 0.01
                      ? usdFormatter.format(bank.position.liquidationPrice)
                      : `$${bank.position.liquidationPrice.toExponential(2)}`}
                  </dd>
                </>
              )}
            </dl>
          </div>
          <div className="flex w-full gap-3">
            <PortfolioAction
              requestedBank={bank}
              buttonVariant="outline-dark"
              requestedAction={isInLendingMode ? ActionType.Withdraw : ActionType.Repay}
            />
            <PortfolioAction
              requestedBank={bank}
              requestedAction={isInLendingMode ? ActionType.Deposit : ActionType.Borrow}
            />
          </div>

          {postionMovingPossible && (
            <Button
              onClick={() => {
                setIsMovePositionDialogOpen(true);
              }}
              variant={"ghost"}
              className="w-max self-center underline"
            >
              Move position to another account
            </Button>
          )}

          {isMovePositionDialogOpen && (
            <MovePositionDialog
              isOpen={isMovePositionDialogOpen}
              setIsOpen={setIsMovePositionDialogOpen}
              selectedAccount={selectedAccount}
              marginfiAccounts={marginfiAccounts}
              bank={bank}
              marginfiClient={marginfiClient}
              fetchMrgnlendState={fetchMrgnlendState}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

const PortfolioAction = ({
  requestedBank,
  requestedAction,
  buttonVariant = "default",
}: {
  requestedBank: ExtendedBankInfo | null;
  requestedAction: ActionType;
  buttonVariant?: "default" | "outline" | "outline-dark";
}) => {
  const { walletContextState, connected } = useWallet();
  const [fetchMrgnlendState] = useMrgnlendStore((state) => [state.fetchMrgnlendState]);
  const isDust = React.useMemo(() => requestedBank?.isActive && requestedBank?.position.isDust, [requestedBank]);

  const buttonText = React.useMemo(() => {
    switch (requestedAction) {
      case ActionType.Deposit:
        return "Supply more";
      case ActionType.Borrow:
        return "Borrow more";
      case ActionType.Repay:
        return "Repay";
      case ActionType.Withdraw:
        return isDust ? "Close" : "Withdraw";
      default:
        return "";
    }
  }, [requestedAction, isDust]);

  if (requestedAction !== ActionType.Repay) {
    return (
      <ActionBox.Lend
        useProvider={true}
        lendProps={{
          requestedLendType: requestedAction,
          requestedBank: requestedBank ?? undefined,
          walletContextState: walletContextState,
          connected: connected,
          captureEvent: (event, properties) => {
            capture(event, properties);
          },
          onComplete: () => {
            fetchMrgnlendState();
          },
        }}
        isDialog={true}
        dialogProps={{
          trigger: (
            <Button className="flex-1 h-12" variant={buttonVariant}>
              {buttonText}
            </Button>
          ),
          title: `${requestedAction} ${requestedBank?.meta.tokenSymbol}`,
        }}
      />
    );
  } else {
    return (
      <ActionBox.Repay
        useProvider={true}
        repayProps={{
          requestedBank: requestedBank ?? undefined,
          walletContextState: walletContextState,
          connected: connected,
          captureEvent: (event, properties) => {
            capture(event, properties);
          },
          onComplete: () => {
            fetchMrgnlendState();
          },
        }}
        isDialog={true}
        dialogProps={{
          trigger: (
            <Button className="flex-1 h-12" variant={buttonVariant}>
              {buttonText}
            </Button>
          ),
          title: `${requestedAction} ${requestedBank?.meta.tokenSymbol}`,
        }}
      />
    );
  }
};

export const PortfolioAssetCardSkeleton = () => {
  return (
    <div className="flex justify-between items-center w-full p-3 gap-2">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[65px]" />
        </div>
      </div>
      <Skeleton className="h-6 w-[80px] " />
    </div>
  );
};

export const MovePositionDialog = ({
  selectedAccount,
  marginfiAccounts,
  isOpen,
  setIsOpen,
  bank,
  marginfiClient,
  fetchMrgnlendState,
}: {
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiAccounts: MarginfiAccountWrapper[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  bank: ActiveBankInfo;
  marginfiClient: MarginfiClient | null;
  fetchMrgnlendState: () => void;
}) => {
  const [accountToMoveTo, setAccountToMoveTo] = React.useState<MarginfiAccountWrapper | null | undefined>(
    selectedAccount
  );
  const buttonDisabledState = React.useMemo(() => {
    if (accountToMoveTo?.address.toBase58() === selectedAccount?.address.toBase58())
      return "Please select a different account";
    return "active";
  }, [accountToMoveTo, selectedAccount, marginfiAccounts, bank]);

  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const handleMovePosition = React.useCallback(async () => {
    if (!marginfiClient || !accountToMoveTo) {
      return;
    }

    const multiStepToast = new MultiStepToastHandle("Moving position", [
      {
        label: `Moving to account ${`${accountToMoveTo?.address.toBase58().slice(0, 8)}
        ...${accountToMoveTo?.address.toBase58().slice(-8)}`}`,
      },
    ]);
    multiStepToast.start();

    try {
      setIsLoading(true);
      const connection = marginfiClient.provider.connection;
      const blockHash = await connection.getLatestBlockhash();
      const withdrawIx = await selectedAccount?.makeWithdrawIx(bank.position.amount, bank.address);
      if (!withdrawIx) return;
      const withdrawMessage = new TransactionMessage({
        payerKey: marginfiClient.wallet.publicKey,
        recentBlockhash: blockHash.blockhash,
        instructions: [...withdrawIx.instructions],
      });
      const withdrawTx = new VersionedTransaction(withdrawMessage.compileToV0Message());

      const bundleTipIx = makeBundleTipIx(marginfiClient?.wallet.publicKey);
      const depositIx = await accountToMoveTo.makeDepositIx(bank.position.amount, bank.address);
      if (!depositIx) return;
      const depositInstruction = new TransactionMessage({
        payerKey: marginfiClient.wallet.publicKey,
        recentBlockhash: blockHash.blockhash,
        instructions: [...depositIx.instructions, bundleTipIx],
      });
      const depositTx = new VersionedTransaction(depositInstruction.compileToV0Message());

      await marginfiClient.processTransactions([withdrawTx, depositTx]);
      await fetchMrgnlendState();
      multiStepToast.setSuccessAndNext();
      setIsOpen(false);
    } catch (error) {
      console.error("Error moving position between accounts", error);
      multiStepToast.setFailed("Error moving position between accounts");
    } finally {
      setIsLoading(false);
    }
  }, [marginfiClient, accountToMoveTo, marginfiAccounts, selectedAccount, bank]);

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
                Account{" "}
                {marginfiAccounts.findIndex(
                  (account) => account.address.toBase58() === accountToMoveTo?.address.toBase58()
                ) + 1}
              </SelectTrigger>
              <SelectContent>
                {marginfiAccounts.map((account, i) => (
                  <SelectItem key={i} value={account.address.toBase58()}>
                    Account {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between w-full items-center">
            <span className="text-muted-foreground">Account address:</span>
            <div className="flex gap-1 items-center">
              <span className="text-muted-foreground ">
                {`${accountToMoveTo?.address.toBase58().slice(0, 8)}
                  ...${accountToMoveTo?.address.toBase58().slice(-8)}`}
              </span>
            </div>
          </div>{" "}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="w-full">
              <Button className="w-full" onClick={handleMovePosition} disabled={buttonDisabledState !== "active"}>
                {isLoading ? <IconLoader /> : "Move position"}
              </Button>
            </TooltipTrigger>
            {buttonDisabledState !== "active" && (
              <TooltipContent side="top" className="z-50">
                <span>{buttonDisabledState}</span>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <div className=" text-xs text-muted-foreground text-center">
          The transaction will say that there are no balance changes found. The position/funds will be moved between
          marginfi accounts, but will remain on the same wallet.
        </div>
      </DialogContent>
    </Dialog>
  );
};
