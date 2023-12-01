import React from "react";

import { useMrgnlendStore } from "~/store";
import { numeralFormatter } from "@mrgnlabs/mrgn-common";

import { IconInfoCircle } from "~/components/ui/icons";

export const Portfolio = () => {
  const [accountSummary] = useMrgnlendStore((state) => [state.accountSummary]);

  const healthColor = React.useMemo(() => {
    if (accountSummary.healthFactor) {
      let color;

      if (accountSummary.healthFactor >= 0.5) {
        color = "#75BA80"; // green color " : "#",
      } else if (accountSummary.healthFactor >= 0.25) {
        color = "#B8B45F"; // yellow color
      } else {
        color = "#CF6F6F"; // red color
      }

      return color;
    } else {
      return "#fff";
    }
  }, [accountSummary.healthFactor]);
  return (
    <div className="bg-background-gray p-6 rounded-xl space-y-3 w-full my-10">
      <h2 className="font-medium text-3xl">Portfolio</h2>
      <div className="text-muted-foreground">
        <dl className="flex justify-between items-center gap-2">
          <dt className="flex items-center gap-1.5 text-sm">
            Health factor <IconInfoCircle size={16} />
          </dt>
          <dd className="text-2xl font-bold" style={{ color: healthColor }}>
            {numeralFormatter(accountSummary.healthFactor * 100)}%
          </dd>
        </dl>
        <div className="h-2 bg-background-gray-light">
          <div
            className="h-2"
            style={{
              backgroundColor: healthColor,
              width: `${accountSummary.healthFactor * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
