import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { dynamicNumeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { PnlDisplayProps } from "./consts";
import { usePositionsData } from "~/hooks/usePositionsData";
import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";

import { SharePosition } from "~/components/common/share-position";
import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card";

export const PnlDisplay = ({ pool, onDialogOpenChange }: PnlDisplayProps) => {
  const positionData = usePositionsData({ groupPk: pool.groupPk });
  const { positionSizeUsd, leverage } = useLeveragedPositionDetails({ pool });

  return (
    <Card className="py-2">
      <CardHeader className="flex flex-row items-center justify-between px-4 py-2">
        <h1 className={`text-2xl font-medium ${positionData?.pnl > 0 ? "text-success" : "text-error"}`}>
          {`${positionData?.pnl > 0 ? "+" : "-"}$${dynamicNumeralFormatter(Math.abs(positionData?.pnl), {
            minDisplay: 0.0001,
            maxDisplay: 100000,
          })}`}
        </h1>

        {positionData?.pnl > 0 ? (
          <IconTrendingUp size={28} className="text-success self-center" />
        ) : (
          <IconTrendingDown size={28} className="text-error self-center" />
        )}
      </CardHeader>
      <CardContent className="px-4 py-2">
        <div className="flex flex-col gap-2 bg-muted rounded-md px-4 py-2 text-sm w-full min-w-[300px]">
          <div className="flex flex-row items-center justify-between gap-8">
            <span className="text-muted-foreground">Size </span>
            <span>{usdFormatter.format(positionSizeUsd)}</span>
          </div>
          <div className="flex flex-row items-center justify-between gap-8">
            <span className="text-muted-foreground">Leverage </span>
            <span>{`${leverage}x`}</span>
          </div>
          <div className="flex flex-row items-center justify-between gap-8">
            <span className="text-muted-foreground">Price </span>
            <span>${dynamicNumeralFormatter(pool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())}</span>
          </div>
          <div className="flex flex-row items-center justify-between gap-8">
            <span className="text-muted-foreground">Entry price</span>
            <span>${dynamicNumeralFormatter(positionData?.entryPrice)}</span>
          </div>
          {pool.tokenBank.isActive && pool.tokenBank.position.liquidationPrice && (
            <div className="flex flex-row items-center justify-between gap-8">
              <span className="text-muted-foreground">Liquidation price</span>
              <span>${dynamicNumeralFormatter(pool.tokenBank.position.liquidationPrice)}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-row items-center justify-center gap-8 px-4 py-2 ">
        <SharePosition pool={pool} onOpenChange={onDialogOpenChange} />
      </CardFooter>
    </Card>
  );
};
