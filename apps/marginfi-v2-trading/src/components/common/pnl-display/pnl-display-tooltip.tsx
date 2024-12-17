import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { PnlDisplay } from "./pnl-display";
import { PnlDisplayProps } from "./consts";

interface PnlDisplayTooltipProps extends PnlDisplayProps {
  children?: React.ReactNode | string;
}

export const PnlDisplayTooltip = ({
  pnl,
  entryPriceUsd,
  liquidationPriceUsd,
  priceUsd,
  children,
}: PnlDisplayTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          {children || (
            <div className="flex flex-inline items-center gap-1">
              PNL <InfoCircledIcon />
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent className="p-0 m-0 rounded-xl min-w-80 max-w-96" side="top">
          <PnlDisplay
            pnl={pnl}
            entryPriceUsd={entryPriceUsd}
            liquidationPriceUsd={liquidationPriceUsd}
            priceUsd={priceUsd}
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
