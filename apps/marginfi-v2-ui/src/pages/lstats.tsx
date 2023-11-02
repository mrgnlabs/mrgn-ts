import { useEffect, useState } from "react";
import { MenuItem, Select } from "@mui/material";
import {
  StakePoolsStatsPerEpoch,
  StakePoolsStatsWithMeta,
  createStakePoolsStatsStore,
} from "~/store/stakePoolStatsStore";
import {
  ApyBarChart,
  AverageApyBarChar,
  HistoricalApy,
  StakePoolDetailsTable,
  StakePoolStats,
} from "~/components/desktop/StakePoolsStats";

export const useStakePoolsStatsStore = createStakePoolsStatsStore();

const StakePoolsStats = () => {
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);
  const [selectedPool, setSelectedPool] = useState<StakePoolsStatsWithMeta | null>(null);

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
  const historicalApys = stakePoolsStatsPerEpoch ? makeHistoricalApyPerPool(stakePoolsStatsPerEpoch) : {};

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
      <div className="w-full flex flex-col">
        <div className="w-full flex flex-col">
          <span className="w-full flex justify-center text-lg font-bold">Historical stats</span>
          <div className="w-full flex flex-row">
            <div className="w-1/2">
              {stakePoolsStatsPerEpoch && (
                <HistoricalApy epochs={[...stakePoolsStatsPerEpoch.keys()]} historicalApys={historicalApys} />
              )}
            </div>
            <div className="w-1/2">
              {stakePoolsStatsPerEpoch && (
                <AverageApyBarChar epochs={[...stakePoolsStatsPerEpoch.keys()]} historicalApys={historicalApys} />
              )}
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col">
          <span className="w-full flex justify-center text-lg font-bold">Epoch stats</span>
          <div className="flex flex-row gap-5 items-center">
            Epoch:
            {selectedEpoch && (
              <Select
                className="bg-[#1C2125] text-white text-base rounded-lg h-12 w-[210px]"
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
            )}
          </div>
          {selectedEpochStats && (
            <div className="w-full flex justify-between gap-8">
              <div className="w-1/2">
                <ApyBarChart stakePools={selectedEpochStats} />
              </div>
              <div className="w-1/2">
                <StakePoolDetailsTable stakePools={selectedEpochStats} />
              </div>
            </div>
          )}
          <div className="w-full flex flex-col">
            <span className="w-full flex justify-center text-lg font-bold">Stake pool stats</span>
            <div className="flex flex-row gap-5 items-center">
              Stake pool:
              {selectedPool && selectedEpochStats && (
                <Select
                  className="bg-[#1C2125] text-white text-base rounded-lg h-12 w-[210px]"
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
              )}
            </div>
            {selectedPool && (
              <div className="w-full">
                <StakePoolStats stakePool={selectedPool} />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="h-20" />
    </div>
  );
};

export default StakePoolsStats;

export const APY_THRESHOLD = 0.03;

function makeHistoricalApyPerPool(
  availableEpochsStats: StakePoolsStatsPerEpoch
): Record<string, { effective: number; baseline: number }[]> {
  const allStakePoolAddresses: string[] = [
    ...new Set([...availableEpochsStats.values()].flatMap((stats) => (stats ? stats.map((sp) => sp.address) : []))),
  ];

  const historicalApysPerPool: Record<string, { effective: number; baseline: number }[]> = {};
  [...availableEpochsStats.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([_, epochStats]) => {
      if (!epochStats) {
        allStakePoolAddresses.forEach((spAddress) => {
          if (!historicalApysPerPool[spAddress]) historicalApysPerPool[spAddress] = [];
          historicalApysPerPool[spAddress].push({ effective: 0, baseline: 0 });
        });

        return;
      }

      allStakePoolAddresses.forEach((spAddress) => {
        const spStats = epochStats.find((sp) => sp.address === spAddress);
        if (!historicalApysPerPool[spAddress]) historicalApysPerPool[spAddress] = [];
        if (!spStats) {
          historicalApysPerPool[spAddress].push({ effective: 0, baseline: 0 });
        } else if (!spStats.is_valid) {
          //@ts-ignore
          historicalApysPerPool[spAddress].push(null);
        } else {
          historicalApysPerPool[spAddress].push({ effective: spStats.apy_effective, baseline: spStats.apy_baseline });
        }
      });
    });

  for (const spAddress of Object.keys(historicalApysPerPool)) {
    if (historicalApysPerPool[spAddress].some((apy) => apy === null)) {
      delete historicalApysPerPool[spAddress];
    } else if (
      historicalApysPerPool[spAddress].every((apy) => apy.baseline < APY_THRESHOLD && apy.effective < APY_THRESHOLD)
    ) {
      delete historicalApysPerPool[spAddress];
    }
  }

  return historicalApysPerPool;
}
