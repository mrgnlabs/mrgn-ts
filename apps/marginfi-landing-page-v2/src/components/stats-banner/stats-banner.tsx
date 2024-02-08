const stats = [
  {
    label: "Total for stat 1",
    value: 37.02,
  },
  {
    label: "Total for stat 2",
    value: 100.78,
  },
  {
    label: "Total for stat 3",
    value: 45.41,
  },
];

export const StatsBanner = () => {
  return (
    <div className="py-12 px-6 border-t border-b border-border my-16">
      <div className="w-full max-w-7xl mx-auto">
        <div className="w-full flex items-center gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="w-full flex flex-col items-center">
              <div className="flex flex-col items-start gap-1">
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
