import React from "react";

import Image from "next/image";

import { PublicKey } from "@solana/web3.js";

import { usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { cn } from "~/utils";
import { useUiStore } from "~/store";
import { useAssetItemData } from "~/hooks/useAssetItemData";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { IconAlertTriangle } from "~/components/ui/icons";
import { Skeleton } from "~/components/ui/skeleton";

interface PortfolioAssetCardProps {
  bank: ActiveBankInfo;
  isInLendingMode: boolean;
}

export const PortfolioAssetCard = ({ bank, isInLendingMode }: PortfolioAssetCardProps) => {
  const [setLendingMode] = useUiStore((state) => [state.setLendingMode]);
  const { rateAP } = useAssetItemData({ bank, isInLendingMode });

  const [requestedAction, setRequestedAction] = React.useState<ActionType>();
  const [requestedToken, setRequestedToken] = React.useState<PublicKey>();

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

  return (
    <Accordion type="single" collapsible>
      <AccordionItem
        value="key-1"
        className="bg-background-gray transition rounded-xl px-3 data-[state=closed]:hover:bg-background-gray-hover"
      >
        <AccordionTrigger className="hover:no-underline outline-none">
          <div className="flex justify-between items-center w-full gap-2">
            <div className="flex text-left gap-3">
              <div className="flex items-center">
                {bank.meta.tokenLogoUri && (
                  <Image
                    src={bank.meta.tokenLogoUri}
                    className="rounded-full"
                    alt={bank.meta.tokenSymbol}
                    height={40}
                    width={40}
                  />
                )}
              </div>
              <dl>
                <dt className="font-medium text-lg">{bank.meta.tokenSymbol}</dt>
                <dd className={cn("text-sm font-normal", isInLendingMode ? "text-[#75BA80]" : "text-[#FBA43A]")}>
                  {rateAP.concat(...[" ", isInLendingMode ? "APY" : "APR"])}
                </dd>
              </dl>
            </div>
            <div className="font-medium text-lg mr-2">
              {bank.position.amount < 0.01 ? "< $0.01" : numeralFormatter(bank.position.amount)}
              {" " + bank.meta.tokenSymbol}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-3">
          {isUserPositionPoorHealth && (
            <div className="flex w-fit gap-2 text-error items-center border border-error rounded-3xl px-4 py-0.5">
              <IconAlertTriangle width={"16px"} height={"16px"} />
              <span>Liquidation risk</span>
            </div>
          )}

          {isIsolated && (
            <div className="flex w-fit gap-2 text-[#686E75] items-center border border-[#474c51] rounded-3xl px-3 pt-0.5 pb-1 text-xs">
              <span>Isolated pool</span>
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
          <ActionBoxDialog requestedAction={requestedAction} requestedToken={requestedToken}>
            <div className="flex w-full gap-3">
              <Button
                onClick={() => {
                  setLendingMode(isInLendingMode ? LendingModes.LEND : LendingModes.BORROW);
                  setRequestedAction(isInLendingMode ? ActionType.Withdraw : ActionType.Repay);
                  setRequestedToken(bank.address);
                }}
                className="flex-1 h-12"
                variant="outline"
              >
                {isInLendingMode ? "Withdraw" : "Repay"}
              </Button>
              <Button
                onClick={() => {
                  setLendingMode(isInLendingMode ? LendingModes.LEND : LendingModes.BORROW);
                  setRequestedAction(isInLendingMode ? ActionType.Deposit : ActionType.Borrow);
                  setRequestedToken(bank.address);
                }}
                className="flex-1 h-12"
                variant="default"
              >
                {isInLendingMode ? "Supply more" : "Borrow more"}
              </Button>
            </div>
          </ActionBoxDialog>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
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
