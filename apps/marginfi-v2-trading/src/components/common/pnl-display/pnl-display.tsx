import { IconCopy, IconDownload, IconShare, IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { PnlDisplayProps } from "./consts";

export const PnlDisplay = ({ pnl, entryPriceUsd, liquidationPriceUsd, priceUsd }: PnlDisplayProps) => {
  return (
    <Card className="py-2">
      <CardHeader className="flex flex-row items-center justify-between px-4 py-2">
        <h1 className={`text-2xl font-medium ${pnl > 0 ? "text-success" : "text-error"}`}>
          {`${pnl > 0 ? "+" : "-"}$${dynamicNumeralFormatter(Math.abs(pnl), {
            minDisplay: 0.0001,
            maxDisplay: 100000,
          })}`}
        </h1>

        {pnl > 0 ? (
          <IconTrendingUp size={28} className="text-success self-center" />
        ) : (
          <IconTrendingDown size={28} className="text-error self-center" />
        )}
      </CardHeader>
      <CardContent className="px-4 py-2">
        <div className="flex flex-col gap-2 bg-muted rounded-md px-4 py-2 text-sm">
          <div className="flex flex-row items-center justify-between ">
            <span className="text-muted-foreground">Price </span>
            <span className={`${priceUsd > 0 ? "text-success" : "text-error"}`}>
              ${dynamicNumeralFormatter(priceUsd)}
            </span>
          </div>
          <div className="flex flex-row items-center justify-between">
            <span className="text-muted-foreground">Entry price</span>
            <span className={`${entryPriceUsd > 0 ? "text-success" : "text-error"}`}>
              ${dynamicNumeralFormatter(entryPriceUsd)}
            </span>
          </div>
          <div className="flex flex-row items-center justify-between">
            <span className="text-muted-foreground">Liquidation price</span>
            <span className={`${liquidationPriceUsd > 0 ? "text-success" : "text-error"}`}>
              ${dynamicNumeralFormatter(liquidationPriceUsd)}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-row items-center justify-between gap-8 px-2 py-2 ">
        <Button size="sm" variant="ghost" className="" onClick={() => {}}>
          <IconShare size={16} />
          Share your PNL
        </Button>
        <div className="flex flex-row items-center justify-between gap-2 pr-2">
          <Button size="sm" variant="outline" onClick={() => {}}>
            <IconCopy size={16} />
            Copy
          </Button>
          <Button size="sm" variant="outline" onClick={() => {}}>
            <IconDownload size={16} />
            Download
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
