import { useEffect, useState } from "react";
import { MenuItem, Select, FormControl } from "@mui/material";
import {
  StakePoolsStatsPerEpoch,
  StakePoolStatsWithMeta,
  createStakePoolsStatsStore,
} from "~/store/stakePoolStatsStore";
import {
  ApyBarChart,
  AverageApyBarChart,
  HistoricalApy,
  StakePoolDetailsTable,
  StakePoolStats,
} from "~/components/desktop/StakePoolsStats";

export const useStakePoolsStatsStore = createStakePoolsStatsStore();

const StakePoolsStats = () => {
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);
  const [selectedPool, setSelectedPool] = useState<StakePoolStatsWithMeta | null>(null);

  const [fetchStats, stakePoolsStatsPerEpoch] = useStakePoolsStatsStore((state) => [
    state.fetchStats,
    state.stakePoolsStatsPerEpoch,
  ]);

  const selectedEpochStats =
    selectedEpoch && stakePoolsStatsPerEpoch
      ? stakePoolsStatsPerEpoch
          .get(selectedEpoch)
          ?.filter(
            (stats) => stats.is_valid && stats.total_lamports_locked > 1e9 && stats.apy_effective > APY_THRESHOLD
          )
          .sort((a, b) => b.apy_effective - a.apy_effective)
      : null;
  const historicalMetrics = stakePoolsStatsPerEpoch ? makeHistoricalApyPerPool(stakePoolsStatsPerEpoch) : {};

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (stakePoolsStatsPerEpoch) {
      const latestEpoch = Math.max(...stakePoolsStatsPerEpoch.keys());
      setSelectedEpoch(latestEpoch);
    }
  }, [stakePoolsStatsPerEpoch]);

  useEffect(() => {
    if (selectedEpochStats) {
      if (!selectedPool) {
        const selected = selectedEpochStats.find((sp) => sp.name === "mrgn");
        if (!selected) throw new Error("Selected stake pool not found");
        setSelectedPool(selected);
      } else if (selectedPool.epoch !== selectedEpoch) {
        const selected = selectedEpochStats.find((sp) => sp.name === selectedPool.name);
        if (!selected) throw new Error("Selected stake pool not found");
        setSelectedPool(selected);
      }
    }
  }, [selectedEpoch, selectedPool, selectedEpochStats]);

  return (
    <div className="flex flex-col w-[90%]">
      <div className="w-full flex flex-col space-y-10 pt-16 pb-32">
        <div className="w-full flex flex-col border-b border-solid border-[#868E95]/30 pb-12">
          <span className="w-full flex text-3xl font-medium mb-6">Historical stats</span>
          <div className="w-full grid grid-cols-12 gap-8">
            <div className="col-span-7">
              {stakePoolsStatsPerEpoch && (
                <HistoricalApy epochs={[...stakePoolsStatsPerEpoch.keys()]} historicalMetrics={historicalMetrics} />
              )}
            </div>
            <div className="col-span-5 h-full">
              {stakePoolsStatsPerEpoch && (
                <AverageApyBarChart
                  epochs={[...stakePoolsStatsPerEpoch.keys()]}
                  historicalMetrics={historicalMetrics}
                />
              )}
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col border-b border-solid border-[#868E95]/30 pb-12">
          <header className="flex items-center justify-between">
            <span className="w-full flex text-3xl font-medium mb-6">Epoch stats</span>
            <div className="space-y-1.5 flex flex-col items-end text-sm">
              <p>Select Epoch</p>
              {selectedEpoch && (
                <FormControl size="small">
                  <Select
                    className="bg-[#1C2125] text-white text-sm h-10 rounded-lg w-[210px]"
                    MenuProps={{
                      PaperProps: {
                        style: { backgroundColor: "#1C2125", color: "#fff" },
                      },
                    }}
                    variant="outlined"
                    classes={{ standard: "test-white" }}
                    value={selectedEpoch}
                    onChange={(event) => {
                      setSelectedEpoch(event.target.value as number);
                    }}
                  >
                    {[...(stakePoolsStatsPerEpoch?.keys() ?? [])].map((epoch) => {
                      return (
                        <MenuItem key={epoch} value={epoch}>
                          {epoch}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}
            </div>
          </header>
          {selectedEpochStats && (
            <div className="w-full grid grid-cols-12 gap-12 mt-8">
              <div className="col-span-5">
                <ApyBarChart stakePools={selectedEpochStats} />
              </div>
              <div className="col-span-7">
                <StakePoolDetailsTable stakePools={selectedEpochStats} />
              </div>
            </div>
          )}
        </div>
        <div>
          <header className="flex items-center justify-between">
            <span className="w-full flex text-3xl font-medium mb-6">Stake pool stats</span>
            <div className="space-y-1.5 flex flex-col items-end text-sm">
              <p>Select Stake Pool</p>
              {selectedPool && selectedEpochStats && (
                <FormControl size="small">
                  <Select
                    className="bg-[#1C2125] text-white text-sm h-10 rounded-lg w-[210px]"
                    MenuProps={{
                      PaperProps: {
                        style: { backgroundColor: "#1C2125", color: "#fff" },
                      },
                    }}
                    variant="outlined"
                    classes={{ standard: "test-white" }}
                    value={selectedPool.name}
                    onChange={(event) => {
                      const selected = selectedEpochStats.find((sp) => sp.name === event.target.value);
                      if (!selected) throw new Error("Selected stake pool not found");
                      setSelectedPool(selected);
                    }}
                  >
                    {selectedEpochStats
                      .filter((stats) => stats.apy_effective > APY_THRESHOLD)
                      .map((stakePoolStats) => {
                        return (
                          <MenuItem key={stakePoolStats.address} value={stakePoolStats.name}>
                            {stakePoolStats.name}
                          </MenuItem>
                        );
                      })}
                  </Select>
                </FormControl>
              )}
            </div>
          </header>
          {selectedPool && (
            <div className="w-full">
              <StakePoolStats stakePool={selectedPool} stakePoolHistory={historicalMetrics[selectedPool.address]} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StakePoolsStats;

export const APY_THRESHOLD = 0.03;

export type StakePoolMetrics = {
  epoch: number;
  apyEffective: number;
  apyBaseline: number;
  activeSol: number;
  deactivatingSol: number;
  undelegatedSol: number;
  activatingSol: number;
};

const DEFAULT_METRICS: StakePoolMetrics = {
  epoch: 0,
  apyEffective: 0,
  apyBaseline: 0,
  activeSol: 0,
  deactivatingSol: 0,
  undelegatedSol: 0,
  activatingSol: 0,
};

function makeHistoricalApyPerPool(availableEpochsStats: StakePoolsStatsPerEpoch): Record<string, StakePoolMetrics[]> {
  const allStakePoolAddresses: string[] = [
    ...new Set([...availableEpochsStats.values()].flatMap((stats) => (stats ? stats.map((sp) => sp.address) : []))),
  ];

  const historicalMetricsPerPool: Record<string, StakePoolMetrics[]> = {};
  [...availableEpochsStats.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([_, epochStats]) => {
      if (!epochStats) {
        allStakePoolAddresses.forEach((spAddress) => {
          if (!historicalMetricsPerPool[spAddress]) historicalMetricsPerPool[spAddress] = [];
          historicalMetricsPerPool[spAddress].push(DEFAULT_METRICS);
        });

        return;
      }

      allStakePoolAddresses.forEach((spAddress) => {
        const spStats = epochStats.find((sp) => sp.address === spAddress);
        if (!historicalMetricsPerPool[spAddress]) historicalMetricsPerPool[spAddress] = [];
        if (!spStats) {
          historicalMetricsPerPool[spAddress].push(DEFAULT_METRICS);
        } else if (!spStats.is_valid) {
          //@ts-ignore
          historicalMetricsPerPool[spAddress].push(null);
        } else {
          historicalMetricsPerPool[spAddress].push({
            epoch: spStats.epoch,
            apyEffective: spStats.apy_effective,
            apyBaseline: spStats.apy_baseline,
            activeSol: spStats.active_lamports,
            deactivatingSol: spStats.deactivating_lamports,
            undelegatedSol: spStats.undelegated_lamports,
            activatingSol: spStats.activating_lamports,
          });
        }
      });
    });

  // Remove problematic pools
  for (const spAddress of Object.keys(historicalMetricsPerPool)) {
    if (historicalMetricsPerPool[spAddress].some((apy) => apy === null)) {
      delete historicalMetricsPerPool[spAddress];
    } else if (
      historicalMetricsPerPool[spAddress].every(
        (apy) => apy.apyBaseline < APY_THRESHOLD && apy.apyEffective < APY_THRESHOLD
      )
    ) {
      delete historicalMetricsPerPool[spAddress];
    }
  }

  return historicalMetricsPerPool;
}
