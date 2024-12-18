import React from "react";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { PnlDisplay } from "~/components/common/pnl-display";
import { PnlDisplayProps } from "~/components/common/pnl-display/consts";

interface PnlDisplayTooltipProps extends PnlDisplayProps {
  children?: React.ReactNode | string;
}

export const PnlDisplayTooltip = ({ pool, children }: PnlDisplayTooltipProps) => {
  const [tooltipOpen, setTooltipOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Keep tooltip open when dialog is open
  React.useEffect(() => {
    if (dialogOpen) {
      setTooltipOpen(true);
    }
  }, [tooltipOpen, dialogOpen]);

  return (
    <TooltipProvider>
      <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger>
          {children || (
            <div className="flex flex-inline items-center gap-1">
              PNL <InfoCircledIcon />
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent className="p-0 m-0 rounded-xl max-w-none" side="top">
          <PnlDisplay pool={pool} onDialogOpenChange={setDialogOpen} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
