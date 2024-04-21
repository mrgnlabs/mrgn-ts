import React from "react";
import { usdFormatterDyn } from "@mrgnlabs/mrgn-common";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { IconInfoCircle } from "~/components/ui/icons";
import { Skeleton } from "~/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { YbxTokensList } from "./YbxTokenList";

type ActionBoxAvailableCollateralProps = {
  isLoading: boolean;
  // marginfiAccount: MarginfiAccountWrapper;
};

export const AvailableCollateral = ({ isLoading }: ActionBoxAvailableCollateralProps) => {
  const [availableRatio, setAvailableRatio] = React.useState<number>(0);
  const [availableAmount, setAvailableAmount] = React.useState<number>(0);

  const healthColor = React.useMemo(() => 1, []); //availableRatio

  return (
    <div className="mb-6 bg-background-gray-light rounded-lg">
      <Collapsible className="bg-background-gray-light rounded-lg p-2">
        <CollapsibleTrigger className="flex w-full gap-2.5 ">
          <div className="flex-1 space-y-2">
            <dl className="flex justify-between items-center text-muted-foreground gap-2">
              <dt className="flex items-center gap-1.5 text-sm">
                Available LST collateral
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
            <div className="h-2 mb-2 bg-background-gray">
              <div
                className="h-2"
                style={{
                  backgroundColor: `${healthColor}`,
                  width: `${10}%`,
                }}
              />
            </div>
          </div>
          <div className="flex m-auto">
            <ChevronDownIcon width={20} height={20} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="bg-background-gray-light">
          <YbxTokensList />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
