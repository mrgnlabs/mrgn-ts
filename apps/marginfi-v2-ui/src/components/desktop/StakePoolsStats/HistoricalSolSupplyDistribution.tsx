import { numeralFormatter } from "@mrgnlabs/mrgn-common";
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
import { FC } from "react";
import { Line } from "react-chartjs-2";
import { EpochStats } from "~/store/stakePoolStatsStore";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

export const HistoricalSolSupplyDistribution: FC<{
  epochs: number[];
  generalMetricsPerEpoch: Map<number, EpochStats | null>;
}> = ({ epochs, generalMetricsPerEpoch }) => {
  const colors = chroma
    .scale(["#663399", "#00A86B"])
    .mode("lab")
    .colors(4)
    .map((color) => chroma(color).alpha(0.9).hex());

  const datasets = [
    {
      label: "Undelegated stake pool lamports",
      fill: true,
      data: epochs.map((epoch) => (generalMetricsPerEpoch.get(epoch)?.totalUndelegatedLamports ?? 0) / 1e9),
      borderColor: chroma(colors[0]).darken().hex(),
      backgroundColor: colors[0],
    },
    {
      label: "Liquid stake",
      fill: true,
      data: epochs.map((epoch) => (generalMetricsPerEpoch.get(epoch)?.totalLiquidStake ?? 0) / 1e9),
      borderColor: chroma(colors[1]).darken().hex(),
      backgroundColor: colors[1],
    },
    {
      label: "Native stake",
      fill: true,
      data: epochs.map((epoch) => (generalMetricsPerEpoch.get(epoch)?.totalNativeStake ?? 0) / 1e9),
      borderColor: chroma(colors[2]).darken().hex(),
      backgroundColor: colors[2],
    },
    {
      label: "Total supply",
      fill: true,
      data: epochs.map((epoch) => (generalMetricsPerEpoch.get(epoch)?.totalSolSupply ?? 0) / 1e9),
      borderColor: chroma(colors[3]).darken().hex(),
      backgroundColor: colors[3],
    },
  ];

  const historicalMetricsOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: `Historical SOL distribution`,
      },
      legend: {
        display: true,
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem: TooltipItem<"line">) =>
            `${tooltipItem.dataset.label}: ${numeralFormatter(tooltipItem.parsed.y)} SOL`,
        },
      },
    },
    interaction: {
      mode: "x" as const,
    },
  };

  return (
    <div className="flex flex-col justify-start">
      <div className="h-[400px]">
        <Line
          options={historicalMetricsOptions}
          data={{
            labels: epochs,
            datasets: datasets,
          }}
        />
      </div>
    </div>
  );
};
