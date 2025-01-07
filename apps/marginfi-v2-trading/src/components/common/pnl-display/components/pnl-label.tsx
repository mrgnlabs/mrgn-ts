import React from "react";

import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Skeleton } from "~/components/ui/skeleton";

type PnlLabelProps = {
  type?: "$" | "%";
  pnl?: number;
  positionSize: number;
  className?: string;
  disableClickToChangeType?: boolean;
  loader?: React.ReactNode;
};

const PnlLabel = ({
  type = "$",
  pnl,
  positionSize,
  className,
  disableClickToChangeType = false,
  loader,
}: PnlLabelProps) => {
  const [tooltipOpen, setTooltipOpen] = React.useState(false);
  const [currentType, setCurrentType] = React.useState(type);

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

  React.useEffect(() => {
    setCurrentType(type);
  }, [type]);

  return (
    <TooltipProvider>
      <Tooltip open={disableClickToChangeType ? false : tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger>
          <span
            className={cn(
              className,
              disableClickToChangeType ? "cursor-default" : "cursor-pointer",
              positionState === "positive" && "text-success",
              positionState === "negative" && "text-error"
            )}
            onClick={() => {
              if (disableClickToChangeType) return;
              setCurrentType(currentType === "$" ? "%" : "$");
            }}
          >
            {pnlSign}
            {currentType === "$" && <span>{usdFormatter.format(pnl ?? 0)}</span>}
            {currentType === "%" && <span>{pnlPercentage.toFixed(2)}%</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle to show {currentType === "$" ? "%" : "$"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { PnlLabel };
