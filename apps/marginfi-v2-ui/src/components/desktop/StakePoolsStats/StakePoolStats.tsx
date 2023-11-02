import { FC } from "react";
import { StakePoolsStatsWithMeta } from "~/store/stakePoolStatsStore";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import chroma from "chroma-js";

ChartJS.register(ArcElement, Tooltip, Legend);

export const StakePoolStats: FC<{ stakePool: StakePoolsStatsWithMeta }> = ({ stakePool }) => {
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
    <div className="w-1/3">
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
    </div>
  );
};
