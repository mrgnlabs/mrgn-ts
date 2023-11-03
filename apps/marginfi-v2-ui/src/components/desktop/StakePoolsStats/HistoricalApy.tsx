import { percentFormatterDyn, shortenAddress } from "@mrgnlabs/mrgn-common";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Filler,
  TooltipItem,
} from "chart.js";
import chroma from "chroma-js";
import { FC, useState } from "react";
import { Line } from "react-chartjs-2";
import { MrgnContainedSwitch } from "~/components/common";
import { APY_THRESHOLD, StakePoolMetrics } from "~/pages/lstats";
import { STAKE_POOLS_METAS } from "~/store/stakePoolStatsStore";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

export const HistoricalApy: FC<{
  epochs: number[];
  historicalMetrics: Record<string, StakePoolMetrics[]>;
}> = ({ epochs, historicalMetrics }) => {
  const [showBaseline, setShowBaseline] = useState<boolean>(true);

  const colors = chroma
    .scale(["#663399", "#00A86B"])
    .mode("lab")
    .colors(Object.keys(historicalMetrics).length)
    .map((color) => chroma(color).alpha(0.9).hex());
  const datasets = Object.entries(historicalMetrics)
    .filter(([_, historicalMetrics]) => historicalMetrics.every((apy) => apy.apyEffective > APY_THRESHOLD))
    .sort(
      (a, b) =>
        a[1].reduce((sum, e) => {
          sum += showBaseline ? e.apyBaseline : e.apyEffective;
          return sum;
        }, 0) -
        b[1].reduce((sum, e) => {
          sum += showBaseline ? e.apyBaseline : e.apyEffective;
          return sum;
        }, 0)
    )
    .map(([spAddress, spApys], i) => {
      const spName = Object.keys(STAKE_POOLS_METAS).includes(spAddress)
        ? STAKE_POOLS_METAS[spAddress].name
        : shortenAddress(spAddress);

      return {
        label: spName,
        fill: true,
        data: spApys.map((apy) => (showBaseline ? apy.apyBaseline * 100 : apy.apyEffective * 100)),
        borderColor: chroma(colors[i]).darken().hex(),
        backgroundColor: colors[i],
      };
    });

  const historicalMetricsOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: `Historical APY - ${showBaseline ? "baseline" : "effective"} (%)`,
      },
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem: TooltipItem<"line">) =>
            `${tooltipItem.dataset.label}: ${percentFormatterDyn.format(tooltipItem.parsed.y / 100)}`,
        },
      },
    },
    interaction: {
      mode: "point" as const,
    },
  };

  return (
    <div className="flex flex-col justify-start">
      <div className="flex justify-start gap-1 items-center text-sm">
        <MrgnContainedSwitch
          checked={showBaseline}
          onChange={(event) => {
            setShowBaseline(event.target.checked);
          }}
        />
        Show baseline APY
      </div>
      <div className="h-[400px]">
        <Line
          options={historicalMetricsOptions}
          data={{
            labels: epochs,
            datasets: datasets,
          }}
        />
      </div>
      <div className="grid grid-cols-9 w-4/5 mx-auto gap-4 text-xs text-[#868E95]/50 mt-4">
        {datasets.map((dataset, i) => (
          <div key={i} className="flex flex-col gap-2 font-medium justidy-center text-center">
            <span className="h-2" style={{ backgroundColor: dataset.backgroundColor }}></span>
            <span>{dataset.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
