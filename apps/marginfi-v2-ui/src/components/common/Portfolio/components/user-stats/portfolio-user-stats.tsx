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
  supplied7d?: StatsData;
  borrowed7d?: StatsData;
  netValue7d?: StatsData;
  latestNetInterest?: number;
  netInterest30d?: StatsData;
  isLoading?: boolean;
  isLoadingPortfolio?: boolean;
  isLoadingInterest?: boolean;
}

// Helper function to format change value and percentage
const formatChange = (change: number, changePercent: number, tooltipContent: string) => {
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
            <p>{tooltipContent}</p>
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
      {sign}$
      {dynamicNumeralFormatter(change, {
        minDisplay: 0.001,
      })}{" "}
      ({sign}
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
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const PortfolioUserStats = ({
  supplied,
  borrowed,
  netValue,
  supplied7d,
  borrowed7d,
  netValue7d,
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
              {!isLoadingPortfolio && supplied7d ? (
                formatChange(supplied7d.change, supplied7d.changePercent, "7 day change")
              ) : (
                <Skeleton className="inline-block h-4 w-16 ml-1" />
              )}
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
              {!isLoadingPortfolio && borrowed7d ? (
                formatChange(borrowed7d.change, borrowed7d.changePercent, "7 day change")
              ) : (
                <Skeleton className="inline-block h-4 w-16 ml-1" />
              )}
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
              {!isLoadingPortfolio && netValue7d ? (
                formatChange(netValue7d.change, netValue7d.changePercent, "7 day change")
              ) : (
                <Skeleton className="inline-block h-4 w-16 ml-1" />
              )}
            </>
          )
        }
      />
      <Stat
        label="Net interest"
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
                formatChange(netInterest30d.change, netInterest30d.changePercent, "30 day change")
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
