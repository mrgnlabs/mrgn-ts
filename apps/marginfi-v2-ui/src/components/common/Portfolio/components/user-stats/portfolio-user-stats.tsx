import { IconInfoCircle } from "@tabler/icons-react";

interface PortfolioUserStatsProps {
  supplied: string;
  borrowed: string;
  netValue: string;
  points: string;
}

export const PortfolioUserStats = ({ supplied, borrowed, netValue }: PortfolioUserStatsProps) => {
  return (
    <div className="flex justify-between flex-wrap gap-y-4">
      <Stat label="Supplied" value={supplied} />
      <Stat label="Borrowed" value={borrowed} />
      <Stat label="Net value" value={netValue} />
      <Stat
        label={
          <div className="flex items-center gap-1">
            <IconInfoCircle size={16} />
            Interest earned
          </div>
        }
        value={<span className="text-mrgn-success text-right w-full block">+$2.56</span>}
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
