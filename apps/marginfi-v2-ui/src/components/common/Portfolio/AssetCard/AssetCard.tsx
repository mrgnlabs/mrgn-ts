import Image from "next/image";
import React, { FC } from "react";
import { usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { IconAlertTriangle } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { useAssetItemData } from "~/hooks/useAssetItemData";

interface props {
  bank: ActiveBankInfo;
  isInLendingMode: boolean;
}

export const AssetCard: FC<props> = ({ bank, isInLendingMode }) => {
  const { rateAP, assetWeight, isBankFilled, isBankHigh, bankCap } = useAssetItemData({ bank, isInLendingMode });

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
        <AccordionTrigger>
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
                <dd className="text-[#A1A1A1] text-sm">{rateAP.concat(...[" ", isInLendingMode ? "APY" : "APR"])}</dd>
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
          <div>
            {/* <Button variant="outline">Withdraw </Button>
            <Button variant="default">Supply more</Button> */}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
