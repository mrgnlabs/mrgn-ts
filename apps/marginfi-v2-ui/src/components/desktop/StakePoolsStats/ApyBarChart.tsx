import { percentFormatterDyn } from "@mrgnlabs/mrgn-common";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
} from "chart.js";
import { FC, useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { MrgnContainedSwitch } from "~/components/common";
import { APY_THRESHOLD } from "~/pages/lstats";
import { StakePoolsStatsWithMeta } from "~/store/stakePoolStatsStore";

ChartJS.register(BarElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

let epochApyDelayed: boolean;
const options = {
  indexAxis: "x" as const,
  plugins: {
    title: {
      display: true,
      text: "Stake pool APY (%)",
    },
    tooltip: {
      callbacks: {
        label: (tooltipItem: TooltipItem<"bar">) => `${percentFormatterDyn.format(tooltipItem.parsed.y / 100)}`,
      },
    },
  },
  responsive: true,
  animation: {
    onComplete: () => {
      epochApyDelayed = true;
    },
    delay: (context: any) => {
      let delay = 0;
      if (context.type === "data" && context.mode === "default" && !epochApyDelayed) {
        delay = context.dataIndex * 300 + context.datasetIndex * 100;
      }
      return delay;
    },
  },
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
    },
  },
  interaction: {
    mode: "index" as const,
  },
};

export const ApyBarChart: FC<{ stakePools: StakePoolsStatsWithMeta[] }> = ({ stakePools }) => {
  const [sortByBaseline, setSortByBaseline] = useState<boolean>(true);

  const apyBarChartData = useMemo(() => {
    const stakePoolsSorted = stakePools
      .filter((stat) => stat.apy_effective > APY_THRESHOLD)
      .sort((stat1, stat2) => {
        if (sortByBaseline) {
          return stat2.apy_baseline - stat1.apy_baseline;
        } else {
          return stat2.apy_effective - stat1.apy_effective;
        }
      });

    const labels = stakePoolsSorted.map((stat) => stat.name);
    const effectiveYield = stakePoolsSorted.map((stat) => stat.apy_effective * 100);
    const baselineYield = stakePoolsSorted.map((stat) => stat.apy_baseline * 100);

    return {
      labels,
      datasets: [
        {
          label: "Effective",
          data: effectiveYield,
          backgroundColor: "#663399",
          stack: "stack 0",
        },
        {
          label: "Baseline",
          data: baselineYield,
          backgroundColor: "#00A86B",
          stack: "stack 1",
        },
      ],
    };
  }, [sortByBaseline, stakePools]);

  return (
    <div className="flex flex-col justify-start">
      <div className="flex justify-start gap-2 items-center">
        <MrgnContainedSwitch
          checked={sortByBaseline}
          onChange={(event) => {
            setSortByBaseline(event.target.checked);
          }}
        />
        Sort by baseline APY
      </div>
      <Bar options={options} data={apyBarChartData} />
    </div>
  );
};
