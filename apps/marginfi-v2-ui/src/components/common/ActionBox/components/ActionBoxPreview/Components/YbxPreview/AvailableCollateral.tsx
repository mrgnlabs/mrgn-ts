import React from "react";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { usdFormatterDyn } from "@mrgnlabs/mrgn-common";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { IconInfoCircle } from "~/components/ui/icons";
import { Skeleton } from "~/components/ui/skeleton";

type ActionBoxAvailableCollateralProps = {
  isLoading: boolean;
  // marginfiAccount: MarginfiAccountWrapper;
};

export const AvailableCollateral = ({ isLoading }: ActionBoxAvailableCollateralProps) => {
  const [availableRatio, setAvailableRatio] = React.useState<number>(0);
  const [availableAmount, setAvailableAmount] = React.useState<number>(0);

  const healthColor = React.useMemo(() => 1, []); //availableRatio

  return (
    <div className="pb-6">
      <dl className="flex justify-between items-center text-muted-foreground  gap-2">
        <dt className="flex items-center gap-1.5 text-sm pb-2">
          Available deposited LSTs collateral
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconInfoCircle size={16} />
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-2">
                  <p>Available collateral is the USD value of your collateral not actively backing a loan.</p>
                  <p>It can be used to open additional borrows or withdraw part of your collateral.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </dt>
        <dd className="text-sm font-medium text-white">
          {isLoading ? <Skeleton className="h-4 w-[45px] bg-[#373F45]" /> : usdFormatterDyn.format(1)}
        </dd>
      </dl>
      <div className="h-2 mb-2 bg-background-gray-light">
        <div
          className="h-2"
          style={{
            backgroundColor: `${healthColor}`,
            width: `${10}%`,
          }}
        />
      </div>
    </div>
  );
};
