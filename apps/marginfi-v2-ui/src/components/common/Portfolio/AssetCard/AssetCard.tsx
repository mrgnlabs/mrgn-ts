import Image from "next/image";
import React, { FC } from "react";
import { usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { IconAlertTriangle } from "~/components/ui/icons";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { Skeleton } from "~/components/ui/skeleton";
import { useUiStore } from "~/store";
import { LendingModes } from "~/types";

interface props {
  bank: ActiveBankInfo;
  isInLendingMode: boolean;
}

export const AssetCard: FC<props> = ({ bank, isInLendingMode }) => {
  const [setActionMode, setSelectedToken, setLendingMode] = useUiStore((state) => [
    state.setActionMode,
    state.setSelectedToken,
    state.setLendingMode,
  ]);
  const { rateAP } = useAssetItemData({ bank, isInLendingMode });

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
    <Accordion type="single" collapsible className="bg-background-gray rounded-xl px-3">
      <AccordionItem value="key-1">
        <AccordionTrigger className="hover:no-underline">
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
                <dd className={`${isInLendingMode ? "text-[#75BA80]" : "text-[#CF6F6F]"} text-sm`}>
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
            <div className="flex w-fit gap-2 text-[#686E75] items-center border border-[#686E75] rounded-3xl px-4 py-0.5">
              <span>Isolated pool</span>
            </div>
          )}

          <div className="bg-background p-3 rounded-xl">
            <dl className="flex justify-between">
              <dt className="text-base font-normal text-muted-foreground">USD value</dt>
              <dd className="text-lg font-medium text-white">
                {bank.position.usdValue < 0.01 ? "< $0.01" : usdFormatter.format(bank.position.usdValue)}
              </dd>
            </dl>
            <dl className="flex justify-between">
              <dt className="text-base font-normal text-muted-foreground">Current price</dt>
              <dd className="text-lg font-medium text-white">{usdFormatter.format(bank.info.state.price)}</dd>
            </dl>
            <dl className="flex justify-between">
              <dt className="text-base font-normal text-muted-foreground">Liquidation price</dt>
              <dd
                className={`flex items-center gap-1 text-lg font-medium ${
                  isUserPositionPoorHealth ? "text-error" : "text-white"
                }`}
              >
                {isUserPositionPoorHealth && <IconAlertTriangle width={"16px"} height={"16px"} />}
                {bank?.position?.liquidationPrice &&
                  (bank.position.liquidationPrice > 0.01
                    ? usdFormatter.format(bank.position.liquidationPrice)
                    : `$${bank.position.liquidationPrice.toExponential(2)}`)}
              </dd>
            </dl>
          </div>
          <ActionBoxDialog>
            <div className="flex w-full gap-3">
              <Button
                onClick={() => {
                  setLendingMode(isInLendingMode ? LendingModes.LEND : LendingModes.BORROW);
                  setSelectedToken(bank);
                  setActionMode(isInLendingMode ? ActionType.Withdraw : ActionType.Repay);
                }}
                className="flex-1 h-12"
                variant="outline"
              >
                {isInLendingMode ? "Withdraw" : "Repay"}
              </Button>
              <Button
                onClick={() => {
                  setLendingMode(isInLendingMode ? LendingModes.LEND : LendingModes.BORROW);
                  setSelectedToken(bank);
                  setActionMode(isInLendingMode ? ActionType.Deposit : ActionType.Borrow);
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

export const AssetCardSkeleton = () => {
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
