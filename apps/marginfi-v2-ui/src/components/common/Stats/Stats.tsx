import React from "react";

import { useMrgnlendStore } from "~/store";

import { cn } from "~/utils";

import { numeralFormatter, usdFormatterDyn } from "@mrgnlabs/mrgn-common";

export const Stats = () => {
  const [protocolStats] = useMrgnlendStore((state) => [state.protocolStats]);

  const statsList = React.useMemo(() => {
    return [
      {
        label: "Total deposits",
        value: `$${numeralFormatter(protocolStats?.deposits)}`,
      },
      {
        label: "Total borrows",
        value: `$${numeralFormatter(protocolStats?.borrows)}`,
      },
      {
        label: "Total points",
        value: numeralFormatter(protocolStats?.pointsTotal),
      },
    ];
  }, [protocolStats]);

  return (
    <ul className="flex text-muted-foreground gap-4 justify-center mt-10 mb-6 text-sm md:gap-8 md:text-base">
      {statsList.map((stat, index) => (
        <li key={index} className={cn(index !== statsList.length - 1 && "border-r-2 border-white/20 pr-8")}>
          <dl className="space-y-1 md:space-y-2">
            <dt>{stat.label}</dt>
            <dd className="font-bold md:text-2xl text-white">{stat.value}</dd>
          </dl>
        </li>
      ))}
    </ul>
  );
};
