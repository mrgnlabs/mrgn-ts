import { FC } from "react";
import { StakePoolStatsWithMeta } from "~/store/stakePoolStatsStore";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import chroma from "chroma-js";
import { StakePoolMetrics } from "~/pages/lstats";
import { groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";

ChartJS.register(ArcElement, Tooltip, Legend);

export const StakePoolStats: FC<{ stakePool: StakePoolStatsWithMeta; stakePoolHistory: StakePoolMetrics[] }> = ({
  stakePool,
  stakePoolHistory,
}) => {
  const totalRewards = stakePool.inflation_rewards + stakePool.jito_rewards;
  const totalEffectiveRewards = totalRewards * (1 - stakePool.management_fee);
  const projectedTotalBaselineRewards = totalRewards * (stakePool.apy_baseline / stakePool.apy_effective);

  const managementFeeShare = ((totalEffectiveRewards * stakePool.management_fee) / projectedTotalBaselineRewards) * 100;
  const untappedYieldShare = ((projectedTotalBaselineRewards - totalRewards) / projectedTotalBaselineRewards) * 100;
  const inflationShare = (stakePool.inflation_rewards / projectedTotalBaselineRewards) * 100;
  const jitoShare = (stakePool.jito_rewards / projectedTotalBaselineRewards) * 100;

  const colors = chroma
    .scale(["#663399", "#00A86B"])
    .mode("lab")
    .colors(3)
    .map((color) => chroma(color).alpha(0.8).hex());

  const data = {
    labels: ["Inflation rewards", "Jito rewards", "Management fees", "Untapped yield"],
    datasets: [
      {
        data: [inflationShare, jitoShare, managementFeeShare, untappedYieldShare],
        backgroundColor: [...colors, "rgba(75, 192, 192, 0)"],
        borderColor: [...colors.map((color) => chroma(color).darken().hex()), "rgba(255, 255, 255, 0)"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="grid grid-cols-12 gap-12 mt-8">
      <div className="col-span-4">
        <RewardsDistribution stakePool={stakePool} />
      </div>
      <div className="col-span-8">
        <StakeDistribution stakePoolHistory={stakePoolHistory} />
      </div>
    </div>
  );
};

const RewardsDistribution: FC<{ stakePool: StakePoolStatsWithMeta }> = ({ stakePool }) => {
  const totalRewards = stakePool.inflation_rewards + stakePool.jito_rewards;
  const totalEffectiveRewards = totalRewards * (1 - stakePool.management_fee);
  const projectedTotalBaselineRewards = totalRewards * (stakePool.apy_baseline / stakePool.apy_effective);

  const managementFeeShare = ((totalEffectiveRewards * stakePool.management_fee) / projectedTotalBaselineRewards) * 100;
  const untappedYieldShare = ((projectedTotalBaselineRewards - totalRewards) / projectedTotalBaselineRewards) * 100;
  const inflationShare = (stakePool.inflation_rewards / projectedTotalBaselineRewards) * 100;
  const jitoShare = (stakePool.jito_rewards / projectedTotalBaselineRewards) * 100;

  const colors = chroma
    .scale(["#663399", "#00A86B"])
    .mode("lab")
    .colors(3)
    .map((color) => chroma(color).alpha(0.8).hex());

  const data = {
    labels: ["Inflation rewards", "Jito rewards", "Management fees", "Untapped yield"],
    datasets: [
      {
        data: [inflationShare, jitoShare, managementFeeShare, untappedYieldShare],
        backgroundColor: [...colors, "rgba(25, 25, 25)"],
        borderColor: [...colors.map((color) => chroma(color).darken().hex()), "rgba(255, 255, 255, 0)"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="px-8">
      <div className="h-[400px] pb-8">
        <Doughnut
          options={{
            plugins: {
              legend: {
                display: false,
              },
              title: {
                display: true,
                text: "Rewards distribution (%)",
                padding: {
                  bottom: 20,
                },
              },
              tooltip: {
                callbacks: {},
              },
            },
          }}
          data={data}
        />
      </div>
      <div className="w-full flex justify-center items-center gap-4 text-xs text-[#868E95]/50 mt-4">
        {data.datasets[0].data.map((_dataset, i) => (
          <div key={i} className="flex flex-col gap-2 font-medium justidy-center text-center">
            <span className="h-2" style={{ backgroundColor: data.datasets[0].backgroundColor[i] }}></span>
            <span>{data.labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StakeDistribution: FC<{ stakePoolHistory: StakePoolMetrics[] }> = ({ stakePoolHistory }) => {
  console.log(stakePoolHistory);
  const { labels, activeSol, activatingSol, deactivatingSol, undelegatedSol } = stakePoolHistory
    .sort((a, b) => a.epoch - b.epoch)
    .reduce(
      (acc, epochMetrics) => {
        acc.labels.push(epochMetrics.epoch);
        acc.activeSol.push(epochMetrics.activeSol / 1e9);
        acc.activatingSol.push(epochMetrics.activatingSol / 1e9);
        acc.deactivatingSol.push(epochMetrics.deactivatingSol / 1e9);
        acc.undelegatedSol.push(epochMetrics.undelegatedSol / 1e9);
        return acc;
      },
      {
        labels: [] as number[],
        activeSol: [] as number[],
        activatingSol: [] as number[],
        deactivatingSol: [] as number[],
        undelegatedSol: [] as number[],
      }
    );

  const stakeDistributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Stake distribution (SOL)`,
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem: TooltipItem<"bar">) =>
            `${tooltipItem.dataset.label}: ${groupedNumberFormatterDyn.format(tooltipItem.parsed.y)}`,
        },
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
      mode: "point" as const,
    },
  };

  const colors = chroma
    .scale(["#663399", "#00A86B"])
    .mode("lab")
    .colors(4)
    .map((color) => chroma(color).alpha(0.8).hex());

  const datasets = [
    {
      label: "Active",
      data: activeSol,
      borderColor: chroma(colors[0]).darken().hex(),
      backgroundColor: colors[0],
      stack: "stack0",
    },
    {
      label: "Activating",
      data: activatingSol,
      borderColor: chroma(colors[1]).darken().hex(),
      backgroundColor: colors[1],
      stack: "stack0",
    },
    {
      label: "Deactivating",
      data: deactivatingSol,
      borderColor: chroma(colors[2]).darken().hex(),
      backgroundColor: colors[2],
      stack: "stack0",
    },
    {
      label: "Undelegated",
      data: undelegatedSol,
      borderColor: chroma(colors[3]).darken().hex(),
      backgroundColor: colors[3],
      stack: "stack0",
    },
  ];

  return (
    <div>
      <div className="h-[400px]">
        <Bar
          options={stakeDistributionOptions}
          data={{
            labels,
            datasets,
          }}
        />
      </div>
      <div className="w-full flex justify-center items-center gap-4 text-xs text-[#868E95]/50 mt-4">
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
