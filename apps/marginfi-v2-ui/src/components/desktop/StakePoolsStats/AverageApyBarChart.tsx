import { percentFormatterDyn, shortenAddress } from "@mrgnlabs/mrgn-common";
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
import { FC, useState } from "react";
import { Bar } from "react-chartjs-2";
import { MrgnContainedSwitch } from "~/components/common";
import { APY_THRESHOLD } from "~/pages/lstats";
import { STAKE_POOLS_METAS } from "~/store/stakePoolStatsStore";

ChartJS.register(BarElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

const AVERAGE_WINDOW = 5;

let averageApyDelayed: boolean;
const averageApyOptions = {
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
      averageApyDelayed = true;
    },
    delay: (context: any) => {
      let delay = 0;
      if (context.type === "data" && context.mode === "default" && !averageApyDelayed) {
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

export const AverageApyBarChar: FC<{
  epochs: number[];
  historicalApys: Record<string, { effective: number; baseline: number }[]>;
}> = ({ epochs, historicalApys }) => {
  const [sortByBaseline, setSortByBaseline] = useState<boolean>(true);

  const averageApys = Object.entries(historicalApys)
    .filter(([_, historicalApys]) => historicalApys.every((apy) => apy.effective > APY_THRESHOLD))
    .map(([spAddress, historicalApys]) => {
      const averageEffectiveApy =
        historicalApys.slice(epochs.length - AVERAGE_WINDOW, epochs.length).reduce((sum, apy) => {
          sum += apy.effective;
          return sum;
        }, 0) / AVERAGE_WINDOW;
      const averageBaselineApy =
        historicalApys.slice(epochs.length - AVERAGE_WINDOW, epochs.length).reduce((sum, apy) => {
          sum += apy.baseline;
          return sum;
        }, 0) / AVERAGE_WINDOW;

      return {
        address: Object.keys(STAKE_POOLS_METAS).includes(spAddress)
          ? STAKE_POOLS_METAS[spAddress].name
          : shortenAddress(spAddress),
        apy_effective: averageEffectiveApy,
        apy_baseline: averageBaselineApy,
      };
    })
    .sort((stat1, stat2) => {
      if (sortByBaseline) {
        return stat2.apy_baseline - stat1.apy_baseline;
      } else {
        return stat2.apy_effective - stat1.apy_effective;
      }
    });

  const effectiveYield = averageApys.map((stat) => stat.apy_effective * 100);
  const baselineYield = averageApys.map((stat) => stat.apy_baseline * 100);

  const apyBarChartData = {
    labels: averageApys.map((stat) => stat.address),
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
      <Bar options={averageApyOptions} data={apyBarChartData} />
    </div>
  );
};
