import React from "react";

import Image from "next/image";

import { numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { getTokenImageURL } from "~/utils";
import { useTradeStore } from "~/store";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";

type PositionCardProps = {
  bank: ActiveBankInfo;
};

export const PositionCard = ({ bank }: PositionCardProps) => {
  const [banksIncludingUSDC] = useTradeStore((state) => [state.banksIncludingUSDC]);

  const collateralBank = React.useMemo(() => {
    const bankIndex = banksIncludingUSDC.findIndex((b) => b.address.equals(bank.address));
    if (bankIndex === -1 || bankIndex === banksIncludingUSDC.length - 1) return null;
    return banksIncludingUSDC[bankIndex + 1];
  }, [banksIncludingUSDC, bank]);

  return (
    <div className="bg-background-gray p-4 rounded-2xl space-y-4">
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4 font-medium text-muted-foreground">
          <Image
            src={getTokenImageURL(bank.meta.tokenSymbol)}
            alt={bank.meta.tokenSymbol}
            width={56}
            height={56}
            className="rounded-full"
          />
          <div className="leading-none space-y-0.5">
            <h2 className="text-lg text-primary">{bank.meta.tokenName}</h2>
            <h3>{bank.meta.tokenSymbol}</h3>
          </div>
        </div>
      </div>
      <div className="bg-background rounded-xl p-4">
        <dl className="w-full grid grid-cols-2 text-sm text-muted-foreground gap-1">
          <dt>Size</dt>
          <dd className="text-right text-primary">
            {numeralFormatter(bank.position.amount)} {bank.meta.tokenSymbol}
          </dd>
          <dt>USD Value</dt>
          <dd className="text-right text-primary">{usdFormatter.format(bank.position.usdValue)}</dd>
          <dt>Price</dt>
          <dd className="text-right text-primary">
            {usdFormatter.format(bank.info.oraclePrice.priceRealtime.price.toNumber())}
          </dd>
          {bank.position.liquidationPrice && (
            <>
              <dt>Liquidation Price</dt>
              <dd className="text-right text-primary">{usdFormatter.format(bank.position.liquidationPrice)}</dd>
            </>
          )}
        </dl>
      </div>
      <div className="flex items-center justify-between gap-4">
        <ActionBoxDialog requestedBank={bank} requestedAction={ActionType.Withdraw}>
          <Button variant="secondary">Withdraw</Button>
        </ActionBoxDialog>
        {collateralBank && (
          <ActionBoxDialog requestedBank={collateralBank} requestedAction={ActionType.Deposit}>
            <Button variant="secondary">Add collateral</Button>
          </ActionBoxDialog>
        )}
      </div>
    </div>
  );
};
