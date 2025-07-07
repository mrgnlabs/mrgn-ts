import React from "react";

import { IconInfoCircle } from "@tabler/icons-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

type ActionProgressBarSkeletonProps = {
  label: string;
  TooltipValue?: React.ReactNode;
};

export const ActionProgressBarSkeleton = ({ label, TooltipValue }: ActionProgressBarSkeletonProps) => {
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
          <span className="text-muted-foreground/60">$0.00</span>
        </dd>
      </dl>
      <div className="h-1.5 mb-2 bg-mfi-action-box-background-dark rounded-full"></div>
    </div>
  );
};
