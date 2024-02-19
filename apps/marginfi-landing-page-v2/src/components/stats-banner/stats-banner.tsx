type StatsBannerProps = {
  stats: {
    label: string;
    value: number;
  }[];
};

export const StatsBanner = ({ stats }: StatsBannerProps) => {
  return (
    <div className="py-12 px-6 border-t border-b border-border my-16">
      <div className="w-full max-w-7xl mx-auto">
        <div className="w-full flex flex-col items-center gap-8 lg:flex-row">
          {stats.map((stat) => (
            <div key={stat.label} className="w-full flex flex-col items-center">
              <div className="flex flex-col items-center gap-1 lg:items-start">
                <p className="text-muted-foreground text-sm uppercase font-light">{stat.label}</p>
                <p className="text-6xl font-medium">${stat.value}m</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
