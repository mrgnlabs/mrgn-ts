import Image from "next/image";

import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

import { cn, getTokenImageURL } from "~/utils";

import type { Position } from "~/types";
import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { Button } from "~/components/ui/button";

type PositionCardProps = {
  position: Position;
};

export const PositionCard = ({ position }: PositionCardProps) => {
  const pnlPositive = position.pnl > 0;
  return (
    <div className="bg-background-gray p-4 rounded-2xl space-y-4">
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4 font-medium text-muted-foreground">
          <Image
            src={getTokenImageURL(position.bank.meta.tokenSymbol)}
            alt={position.bank.meta.tokenSymbol}
            width={56}
            height={56}
            className="rounded-full"
          />
          <div className="leading-none space-y-0.5">
            <h2 className="text-lg text-primary">{position.bank.meta.tokenName}</h2>
            <h3>{position.bank.meta.tokenSymbol}</h3>
          </div>
        </div>
        <div className={cn("flex items-center gap-2 text-lg font-medium", pnlPositive ? "text-success" : "text-error")}>
          <p>
            {pnlPositive && "+"}
            {position.pnl}%
          </p>
          {pnlPositive ? <IconTrendingUp size={18} /> : <IconTrendingDown size={18} />}
        </div>
      </div>
      <div className="bg-background rounded-xl p-4">
        <dl className="w-full grid grid-cols-2 text-sm text-muted-foreground gap-1">
          <dt>Size</dt>
          <dd className="text-right text-primary">
            {position.size} {position.bank.meta.tokenSymbol}
          </dd>
          <dt>Leverage</dt>
          <dd className="text-right text-primary">{position.leverage}x</dd>
          <dt>Entry Price</dt>
          <dd className="text-right text-primary">{usdFormatter.format(position.entryPrice)}</dd>
          <dt>Mark Price</dt>
          <dd className="text-right text-primary">{usdFormatter.format(position.markPrice)}</dd>
          <dt>Liquidation Price</dt>
          <dd className="text-right text-primary">{usdFormatter.format(position.liquidationPrice)}</dd>
          <dt>PnL</dt>
          <dd className={cn("text-right", pnlPositive ? "text-success" : "text-error")}>
            {position.pnl > 0 && "+"}
            {position.pnl}%
          </dd>
        </dl>
      </div>
      <div className="flex items-center justify-between gap-4">
        <Button variant="secondary">Adjust position</Button>
        <Button variant="secondary">Add collateral</Button>
        <Button variant="destructive" className="ml-auto">
          Close
        </Button>
      </div>
    </div>
  );
};
