import { IconClockHour4, IconInfoCircle } from "@tabler/icons-react";
import { dynamicNumeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { Skeleton } from "~/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface StatsData {
  value: number;
  change: number;
  changePercent: number;
}

interface PortfolioUserStatsProps {
  supplied: string;
  borrowed: string;
  netValue: string;
  points: string;
  supplied30d?: StatsData;
  borrowed30d?: StatsData;
  netValue30d?: StatsData;
  latestNetInterest?: number;
  netInterest30d?: StatsData;
  isLoading?: boolean;
  isLoadingPortfolio?: boolean;
  isLoadingInterest?: boolean;
}

// Helper function to format change value and percentage
const formatChange = (change: number, changePercent: number) => {
  // If change is effectively zero, show +$0.00 (0.0%)
  if (Math.abs(change) < 1e-10) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1">
              <span className="text-sm font-light text-muted-foreground">+$0.00 (0.0%)</span>
              <IconInfoCircle size={12} className="text-muted-foreground cursor-help" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>30 day change</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isPositive = change >= 0;
  const colorClass = isPositive ? "text-mrgn-success" : "text-mrgn-warning";
  const sign = isPositive ? "+" : "";

  const formattedChange = (
    <span className={`text-sm font-light ${colorClass}`}>
      {sign}${dynamicNumeralFormatter(change)} ({sign}
      {changePercent.toFixed(1)}%)
    </span>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1">
            {formattedChange}
            <IconInfoCircle size={12} className={`${colorClass} cursor-help`} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>30 day change</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const PortfolioUserStats = ({
  supplied,
  borrowed,
  netValue,
  supplied30d,
  borrowed30d,
  netValue30d,
  latestNetInterest,
  netInterest30d,
  isLoading,
  isLoadingPortfolio,
  isLoadingInterest,
}: PortfolioUserStatsProps) => {
  return (
    <div className="flex justify-between flex-wrap gap-y-4">
      <Stat
        label="Supplied"
        value={
          isLoading ? (
            <Skeleton className="h-6 w-20 mt-1" />
          ) : (
            <>
              {supplied}{" "}
              {/* {!isLoadingPortfolio && supplied30d ? (
                formatChange(supplied30d.change, supplied30d.changePercent)
              ) : (
                <Skeleton className="inline-block h-4 w-16 ml-1" />
              )} */}
            </>
          )
        }
      />
      <Stat
        label="Borrowed"
        value={
          isLoading ? (
            <Skeleton className="h-6 w-20 mt-1" />
          ) : (
            <>
              {borrowed}{" "}
              {/* {!isLoadingPortfolio && borrowed30d ? (
                formatChange(borrowed30d.change, borrowed30d.changePercent)
              ) : (
                <Skeleton className="inline-block h-4 w-16 ml-1" />
              )} */}
            </>
          )
        }
      />
      <Stat
        label="Net value"
        value={
          isLoading ? (
            <Skeleton className="h-6 w-20 mt-1" />
          ) : (
            <>
              {netValue}{" "}
              {/* {!isLoadingPortfolio && netValue30d ? (
                formatChange(netValue30d.change, netValue30d.changePercent)
              ) : (
                <Skeleton className="inline-block h-4 w-16 ml-1" />
              )} */}
            </>
          )
        }
      />
      <Stat
        label="Interest earned"
        value={
          isLoading || isLoadingInterest ? (
            <Skeleton className="h-6 w-20 mt-1" />
          ) : (
            <>
              {(() => {
                // Handle potential negative zero or very small values
                const displayValue = Math.abs(latestNetInterest || 0) < 1e-10 ? 0 : latestNetInterest;
                return displayValue !== undefined ? usdFormatter.format(displayValue) : "$0.00";
              })()}{" "}
              {!isLoadingInterest && netInterest30d ? (
                formatChange(netInterest30d.change, netInterest30d.changePercent)
              ) : (
                <Skeleton className="inline-block h-4 w-16 ml-1" />
              )}
            </>
          )
        }
      />
    </div>
  );
};

const Stat = ({ label, value }: { label: JSX.Element | string; value: JSX.Element | string }) => (
  <dl className="w-1/2 md:w-auto">
    <dt className="text-sm">{label}</dt>
    <dd className="text-xl font-medium text-white">{value}</dd>
  </dl>
);
