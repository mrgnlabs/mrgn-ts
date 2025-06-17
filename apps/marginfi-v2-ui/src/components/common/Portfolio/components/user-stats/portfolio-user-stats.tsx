import { IconClockHour4, IconInfoCircle } from "@tabler/icons-react";

interface PortfolioUserStatsProps {
  supplied: string;
  borrowed: string;
  netValue: string;
  points: string;
}

export const PortfolioUserStats = ({ supplied, borrowed, netValue }: PortfolioUserStatsProps) => {
  return (
    <div className="flex justify-between flex-wrap gap-y-4">
      <Stat
        label="Supplied"
        value={
          <>
            {supplied} <span className="text-sm font-light text-mrgn-success">+$10 (12%)</span>
          </>
        }
      />
      <Stat
        label="Borrowed"
        value={
          <>
            {borrowed} <span className="text-sm font-light text-mrgn-success">+$10 (12%)</span>
          </>
        }
      />
      <Stat
        label="Net value"
        value={
          <>
            {netValue} <span className="text-sm font-light text-mrgn-success">+$10 (12%)</span>
          </>
        }
      />
      <Stat
        label="Interest earned"
        value={
          <>
            $5.15 <span className="text-sm font-light text-mrgn-success">+$10 (12%)</span>
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
