import { cn } from "@mrgnlabs/mrgn-utils";

import { Badge } from "~/components/ui/badge";

type PnlBadgeProps = {
  pnl: number;
  positionSize: number;
  className?: string;
};

const PnlBadge = ({ pnl, positionSize, className }: PnlBadgeProps) => {
  const positionState = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral";
  const pnlSign = positionState === "positive" ? "+" : "";
  const pnlPercentage = ((pnl || 0) / positionSize) * 100;
  return (
    <Badge
      className={cn(
        "bg-muted shadow-none text-muted-foreground text-[11px] px-1",
        className,
        positionState === "positive" && "bg-success/20 text-success",
        positionState === "negative" && "bg-destructive text-destructive-foreground"
      )}
    >
      {pnlSign}
      {`${pnlPercentage.toFixed(2)}%`}
    </Badge>
  );
};

export { PnlBadge };
