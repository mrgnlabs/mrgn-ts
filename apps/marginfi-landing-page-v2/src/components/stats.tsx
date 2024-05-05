import { cn } from "~/lib/utils";

const CONTENT = {
  heading:
    "marginfi is the first integrated liquidity layer with native yield, embedded risk systems, and off-chain data plug-ins",
  stats: [
    {
      kpi: "Total rewards for users",
      value: 37.02,
    },
    {
      kpi: "Total Deposited",
      value: 450,
    },
    {
      kpi: "Total Value Locked",
      value: 300,
    },
  ],
};

export const Stats = () => {
  return (
    <div className="text-center space-y-24 py-24">
      <h2 className="text-5xl max-w-5xl mx-auto w-full">{CONTENT.heading}</h2>
      <ul className="w-full grid grid-cols-3">
        {CONTENT.stats.map((stat, index) => (
          <li
            key={index}
            className={cn(
              "border border-muted-foreground",
              index < CONTENT.stats.length && "border-l-0",
              index === CONTENT.stats.length - 1 && "border-r-0"
            )}
          >
            <dl className="py-20 space-y-8">
              <dt className="text-muted-foreground">{stat.kpi}</dt>
              <dd className="flex items-center justify-center gap-1 text-6xl font-medium">
                <span className="text-4xl">$</span>
                <span>{stat.value}</span>m
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
};
