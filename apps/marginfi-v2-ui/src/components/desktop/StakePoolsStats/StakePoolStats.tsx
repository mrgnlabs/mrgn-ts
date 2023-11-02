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
    <div className="w-full flex">
      <div className="w-1/3">
        <RewardsDistribution stakePool={stakePool} />
      </div>
      <div className="w-2/3">
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
        backgroundColor: [...colors, "rgba(75, 192, 192, 0)"],
        borderColor: [...colors.map((color) => chroma(color).darken().hex()), "rgba(255, 255, 255, 0)"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <Doughnut
      options={{
        plugins: {
          title: {
            display: true,
            text: "Rewards distribution (%)",
          },
          tooltip: {
            callbacks: {},
          },
        },
      }}
      data={data}
    />
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
    plugins: {
      legend: {
        position: "top" as const,
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
    <Bar
      options={stakeDistributionOptions}
      data={{
        labels,
        datasets: datasets,
      }}
    />
  );
};
