import React from "react";

import { IconInfoCircle } from "@tabler/icons-react";

import { usdFormatterDyn } from "@mrgnlabs/mrgn-common";
import { getMaintHealthColor } from "@mrgnlabs/mrgn-utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Skeleton } from "~/components/ui/skeleton";

type ActionProgressBarProps = {
  amount: number;
  ratio: number;
  label: string;
  TooltipValue?: React.ReactNode;
  isLoading?: boolean;
};

export const ActionProgressBar = ({
  amount,
  ratio,
  label,
  TooltipValue,
  isLoading = false,
}: ActionProgressBarProps) => {
  const healthColor = React.useMemo(() => getMaintHealthColor(ratio), [ratio]);

  return (
    <div>
      <dl className="flex justify-between items-center text-muted-foreground gap-2">
        <dt className="flex items-center gap-1.5 text-sm pb-2">
          {label}
          {TooltipValue && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle size={16} />
                </TooltipTrigger>
                <TooltipContent>{TooltipValue}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </dt>
        <dd className="text-sm font-medium">
          {isLoading ? <Skeleton className="h-4 w-[45px] bg-[#373F45]" /> : usdFormatterDyn.format(amount)}
        </dd>
      </dl>
      <div className="h-1.5 mb-2 bg-mfi-action-box-background-dark rounded-full">
        <div
          className="h-1.5 rounded-full"
          style={{
            backgroundColor: `${healthColor}`,
            width: `${ratio * 100}%`,
          }}
        />
      </div>
    </div>
  );
};
