import { IconClockHour4, IconInfoCircle } from "@tabler/icons-react";
import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { Skeleton } from "~/components/ui/skeleton";

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
}

// Helper function to format change value and percentage
const formatChange = (change: number, changePercent: number) => {
  const isPositive = change >= 0;
  const colorClass = isPositive ? "text-mrgn-success" : "text-mrgn-warning";
  const sign = isPositive ? "+" : "";

  return (
    <span className={`text-sm font-light ${colorClass}`}>
      {sign}
      {usdFormatter.format(change)} ({sign}
      {changePercent.toFixed(1)}%)
    </span>
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
              {supplied} {supplied30d && formatChange(supplied30d.change, supplied30d.changePercent)}
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
              {borrowed} {borrowed30d && formatChange(borrowed30d.change, borrowed30d.changePercent)}
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
              {netValue} {netValue30d && formatChange(netValue30d.change, netValue30d.changePercent)}
            </>
          )
        }
      />
      <Stat
        label="Interest earned"
        value={
          isLoading ? (
            <Skeleton className="h-6 w-20 mt-1" />
          ) : (
            <>
              {latestNetInterest !== undefined ? usdFormatter.format(latestNetInterest) : "$0.00"}{" "}
              {netInterest30d && formatChange(netInterest30d.change, netInterest30d.changePercent)}
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
