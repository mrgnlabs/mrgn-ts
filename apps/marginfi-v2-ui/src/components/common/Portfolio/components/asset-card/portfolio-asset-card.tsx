import React from "react";

import Image from "next/image";
import { IconAlertTriangle } from "@tabler/icons-react";

import { usdFormatter, dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { capture } from "@mrgnlabs/mrgn-utils";
import { ActionBox } from "@mrgnlabs/mrgn-ui";
import { cn } from "@mrgnlabs/mrgn-utils";

import { useAssetItemData } from "~/hooks/useAssetItemData";
import { useMrgnlendStore, useUiStore } from "~/store";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { MovePositionDialog } from "../move-position";

interface PortfolioAssetCardProps {
  bank: ActiveBankInfo;
  isInLendingMode: boolean;
  isBorrower?: boolean;
}

export const PortfolioAssetCard = ({ bank, isInLendingMode, isBorrower = true }: PortfolioAssetCardProps) => {
  const { rateAP } = useAssetItemData({ bank, isInLendingMode });
  const [selectedAccount, marginfiAccounts, marginfiClient, fetchMrgnlendState, extendedBankInfos, nativeSolBalance] =
    useMrgnlendStore((state) => [
      state.selectedAccount,
      state.marginfiAccounts,
      state.marginfiClient,
      state.fetchMrgnlendState,
      state.extendedBankInfos,
      state.nativeSolBalance,
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

          <MovePositionDialog
            isOpen={isMovePositionDialogOpen}
            setIsOpen={setIsMovePositionDialogOpen}
            selectedAccount={selectedAccount}
            marginfiAccounts={marginfiAccounts}
            bank={bank}
            marginfiClient={marginfiClient}
            fetchMrgnlendState={fetchMrgnlendState}
            extendedBankInfos={extendedBankInfos}
            nativeSolBalance={nativeSolBalance}
          />
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
