import React from "react";

import { cn } from "@mrgnlabs/mrgn-utils";

import { Badge } from "~/components/ui/badge";

type PnlBadgeProps = {
  pnl: number;
  positionSize: number;
  className?: string;
};

const PnlBadge = ({ pnl, positionSize, className }: PnlBadgeProps) => {
  const positionState = React.useMemo(() => {
    if (pnl) {
      return pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral";
    }
    return "neutral";
  }, [pnl]);

  const pnlSign = React.useMemo(() => {
    if (positionState) {
      return positionState === "positive" ? "+" : "";
    }
    return "";
  }, [positionState]);

  const pnlPercentage = React.useMemo(() => {
    if (pnl && positionSize) {
      return (pnl / positionSize) * 100;
    }
    return 0;
  }, [pnl, positionSize]);

  return (
    <Badge
      className={cn(
        "bg-muted shadow-none text-muted-foreground text-[11px] px-1",
        className,
        positionState === "positive" && "bg-success/20 text-mrgn-success",
        positionState === "negative" && "bg-destructive text-destructive-foreground"
      )}
    >
      {pnlSign}
      {`${pnlPercentage.toFixed(2)}%`}
    </Badge>
  );
};

export { PnlBadge };
