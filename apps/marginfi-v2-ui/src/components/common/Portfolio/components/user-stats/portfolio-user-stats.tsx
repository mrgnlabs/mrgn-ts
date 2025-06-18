import { IconClockHour4, IconInfoCircle } from "@tabler/icons-react";
import { usdFormatter } from "@mrgnlabs/mrgn-common";

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
  netInterest7d?: StatsData;
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
  supplied7d,
  borrowed7d,
  netValue7d,
  latestNetInterest,
  netInterest7d,
}: PortfolioUserStatsProps) => {
  return (
    <div className="flex justify-between flex-wrap gap-y-4">
      <Stat
        label="Supplied"
        value={
          <>
            {supplied} {supplied7d && formatChange(supplied7d.change, supplied7d.changePercent)}
          </>
        }
      />
      <Stat
        label="Borrowed"
        value={
          <>
            {borrowed} {borrowed7d && formatChange(borrowed7d.change, borrowed7d.changePercent)}
          </>
        }
      />
      <Stat
        label="Net value"
        value={
          <>
            {netValue} {netValue7d && formatChange(netValue7d.change, netValue7d.changePercent)}
          </>
        }
      />
      <Stat
        label="Interest earned"
        value={
          <>
            {latestNetInterest !== undefined ? usdFormatter.format(latestNetInterest) : "$0.00"}{" "}
            {netInterest7d && formatChange(netInterest7d.change, netInterest7d.changePercent)}
          </>
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
