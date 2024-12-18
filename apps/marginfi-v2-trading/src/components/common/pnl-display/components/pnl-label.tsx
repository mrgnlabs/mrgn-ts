import React from "react";

import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

type PnlLabelProps = {
  type?: "$" | "%";
  pnl: number;
  positionSize: number;
  className?: string;
  disableClickToChangeType?: boolean;
};

const PnlLabel = ({ type = "$", pnl, positionSize, className, disableClickToChangeType = false }: PnlLabelProps) => {
  const [currentType, setCurrentType] = React.useState(type);
  const positionState = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral";
  const pnlSign = positionState === "positive" ? "+" : positionState === "negative" ? "-" : "";
  const pnlPercentage = (pnl / positionSize) * 100;

  React.useEffect(() => {
    setCurrentType(type);
  }, [type]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span
            className={cn(
              className,
              !disableClickToChangeType && "cursor-pointer",
              positionState === "positive" && "text-success",
              positionState === "negative" && "text-error"
            )}
            onClick={() => {
              if (disableClickToChangeType) return;
              setCurrentType(currentType === "$" ? "%" : "$");
            }}
          >
            {pnlSign}
            {currentType === "$" && (
              <span>
                $
                {dynamicNumeralFormatter(Math.abs(pnl), {
                  minDisplay: 0.0001,
                  maxDisplay: 100000,
                })}
              </span>
            )}
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
