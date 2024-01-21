import { IconClockHour4 } from "~/components/ui/icons";

interface PortfolioUserStatsProps {
  supplied: string;
  borrowed: string;
  netValue: string;
  points: string;
}

export const PortfolioUserStats = ({ supplied, borrowed, netValue }: PortfolioUserStatsProps) => {
  return (
    <div className="flex justify-between flex-wrap mt-5 mb-10 gap-y-4">
      <Stat label="Supplied" value={supplied} />
      <Stat label="Borrowed" value={borrowed} />
      <Stat label="Net value" value={netValue} />
      <Stat
        label="Interest earned"
        value={
          <span className="text-xs font-light flex w-full gap-1.5 items-center mt-1">
            <IconClockHour4 size={14} /> Coming soon
          </span>
        }
      />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: JSX.Element | string }) => (
  <dl className="w-1/2 md:w-auto">
    <dt className="text-sm">{label}</dt>
    <dd className="text-xl font-medium text-white">{value}</dd>
  </dl>
);
