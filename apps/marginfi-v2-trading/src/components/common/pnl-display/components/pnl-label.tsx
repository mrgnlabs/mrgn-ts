import React from "react";

import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Skeleton } from "~/components/ui/skeleton";

interface PnlLabelProps {
  type?: "$" | "%";
  pnl?: number;
  positionSize: number;
  className?: string;
  showTooltip?: boolean;
}

export const PnlLabel = ({ type = "$", showTooltip = true, ...props }: PnlLabelProps) => {
  const [currentType, setCurrentType] = React.useState(type);

  React.useEffect(() => {
    setCurrentType(type);
  }, [type]);

  if (!showTooltip) {
    return <PnlLabelContent currentType={currentType} setCurrentType={undefined} {...props} />;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <PnlLabelContent currentType={currentType} setCurrentType={setCurrentType} {...props} />
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle to show {currentType === "$" ? "%" : "$"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface PnlLabelContentProps extends PnlLabelProps {
  currentType: "$" | "%";
  setCurrentType?: (type: "$" | "%") => void;
}

const PnlLabelContent = ({ pnl, positionSize, className, currentType, setCurrentType }: PnlLabelContentProps) => {
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
    <span
      className={cn(
        className,
        setCurrentType ? "cursor-pointer" : "cursor-default",
        positionState === "positive" && "text-success",
        positionState === "negative" && "text-error"
      )}
      onClick={() => {
        if (!setCurrentType) return;
        setCurrentType(currentType === "$" ? "%" : "$");
      }}
    >
      {pnlSign}
      {currentType === "$" && <span>{usdFormatter.format(pnl ?? 0)}</span>}
      {currentType === "%" && <span>{pnlPercentage.toFixed(2)}%</span>}
    </span>
  );
};
