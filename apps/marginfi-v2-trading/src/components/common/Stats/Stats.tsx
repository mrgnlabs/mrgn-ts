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
        label: "TVL",
        value: numeralFormatter(protocolStats?.tvl),
      },
    ];
  }, [protocolStats]);

  return (
    <ul className="flex text-muted-foreground gap-6 justify-center mt-10 mb-6 md:gap-8">
      {statsList.map((stat, index) => (
        <React.Fragment key={index}>
          <li key={index} className="text-center">
            <h3>{stat.label}</h3>
            <h2 className="font-medium text-lg md:text-2xl text-white">{stat.value}</h2>
          </li>
          {index !== statsList.length - 1 && <li className="border-r-2 border-white/20 hidden md:block" />}
        </React.Fragment>
      ))}
    </ul>
  );
};
