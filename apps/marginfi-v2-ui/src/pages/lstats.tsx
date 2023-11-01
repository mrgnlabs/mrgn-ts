import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import {
  groupedNumberFormatter,
  nativeToUi,
  numeralFormatter,
  percentFormatter,
  percentFormatterDyn,
  shortenAddress,
} from "@mrgnlabs/mrgn-common";
import {
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FC, useEffect, useMemo, useState } from "react";
import { MenuItem, Select } from "@mui/material";
import { MrgnContainedSwitch } from "~/components/common";
import chroma from "chroma-js";

const STAKE_POOLS_METAS: Record<string, { name: string }> = {
  DqhH94PjkZsjAqEze2BEkWhFQJ6EyU6MdtMphMgnXqeK: { name: "mrgn" },
  Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb: { name: "Jito" },
  stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi: { name: "Blaze" },
  CtMyWsrUtAwXWiGr9WjHT5fC3p3fgV8cyGpLTo2LJzG1: { name: "JPool" },
  CgntPoLka5pD5fesJYhGmUCF8KU1QS1ZmZiuAuMZr2az: { name: "Cogent" },
  "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC": { name: "Marinade" },
  "5oc4nmbNTda9fx8Tw57ShLD132aqDK65vuHH4RU1K4LZ": { name: "Socean" },
  "2qyEeSAWKfU18AFthrF7JA8z8ZCi1yt76Tqs917vwQTV": { name: "Laine" },
  "7ge2xKsZXmqPxa3YmXxXmzCp9Hc2ezrTxh6PECaxCwrL": { name: "DAOPool" },
};
const STATS_BUCKET_NAME = "mrgn-public";
const STATS_FOLDER = "stake_pool_data";

const MANIFEST_URL = `https://storage.googleapis.com/${STATS_BUCKET_NAME}/${STATS_FOLDER}/manifest.json`;
const STAT_FILE_URL_PREFIX = `https://storage.googleapis.com/${STATS_BUCKET_NAME}/${STATS_FOLDER}/stats_`;
const STAT_FILE_URL_SUFFIX = ".json";

const EPOCH_WINDOW = 10;

interface EpochStats {
  epoch: number;
  stake_pools: StakePoolStats[];
}

interface StakePoolStats {
  address: string;
  is_valid: boolean;
  provider: string;
  management_fee: number;
  mint: string;
  lst_price: number;
  staked_validator_count: number;
  total_lamports_locked: number;
  pool_token_supply: number;
  undelegated_lamports: number;
  active_lamports: number;
  activating_lamports: number;
  deactivating_lamports: number;
  inflation_rewards: number;
  jito_rewards: number;
  apr_baseline: number;
  apy_baseline: number;
  apr_effective: number;
  apy_effective: number;
}

interface Manifest {
  latest: number;
  epochs: number[];
}

const StakePoolsStats = () => {
  const [availableEpochs, setAvailableEpochs] = useState<number[]>([]);
  const [allEpochsStats, setAllEpochsStats] = useState<EpochStats[]>([]);
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);

  useEffect(() => {
    (async function () {
      const response = await fetch(MANIFEST_URL);
      const data = (await response.json()) as Manifest;
      setAvailableEpochs(data.epochs);
      setSelectedEpoch(data.latest);
    })();
  }, []);

  useEffect(() => {
    if (availableEpochs.length === 0) return;

    (async function () {
      const availableEpochsInWindow = availableEpochs.slice(
        Math.max(availableEpochs.length - EPOCH_WINDOW, 0),
        availableEpochs.length
      );
      const stakePoolStats = await Promise.all(
        availableEpochsInWindow.map(async (epoch) => {
          const response = await fetch(STAT_FILE_URL_PREFIX + epoch + STAT_FILE_URL_SUFFIX);
          const data = (await response.json()) as EpochStats;
          return data;
        })
      );
      setAllEpochsStats(stakePoolStats);
    })();
  }, [availableEpochs]);

  const stakePools = useMemo(() => {
    if (selectedEpoch === null) return [];
    const selectedStats = allEpochsStats.find((stat) => stat.epoch === selectedEpoch);
    if (!selectedStats) return [];

    return selectedStats.stake_pools
      .filter((stat) => stat.is_valid && stat.total_lamports_locked > 1e9)
      .sort((stat1, stat2) => stat2.apr_baseline - stat1.apr_baseline);
  }, [selectedEpoch, allEpochsStats]);

  const [allEpochs, historicalApys] = makeHistoricalApyPerPool(allEpochsStats);

  return (
    <div className="flex flex-col w-[90%]">
      <div className="w-full flex flex-col">
        <div className="w-full flex flex-col">
          <span className="w-full flex justify-center text-lg font-bold">Historical stats</span>
          <div className="w-full flex flex-row">
            <div className="w-1/2">
              <HistoricalApy epochs={allEpochs} historicalApys={historicalApys} />
            </div>
            <div className="w-1/2">
              <AverageApyBarChar epochs={allEpochs} historicalApys={historicalApys} />
            </div>
          </div>
        </div>
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
              {availableEpochs.map((availableEpoch) => {
                return (
                  <MenuItem key={availableEpoch} value={availableEpoch}>
                    {availableEpoch}
                  </MenuItem>
                );
              })}
            </Select>
          )}
        </div>
        <div className="w-full flex justify-between gap-8">
          <div className="w-1/2">
            <ApyBarChart stakePools={stakePools} />
          </div>
        </div>
        <StakePoolDetailsTable stakePools={stakePools} />
      </div>
    </div>
  );
};

export default StakePoolsStats;

// --------- Table config ---------

const columnHelper = createColumnHelper<StakePoolStats>();
const columns = [
  columnHelper.accessor("address", {
    header: () => <span className="w-full flex justify-start">Address</span>,
    cell: (info) => (
      <a href={`https://solscan.io/account/${info.getValue()}`} target="_blank" rel="noreferrer">
        {shortenAddress(info.getValue())}
      </a>
    ),
  }),
  columnHelper.accessor("mint", {
    header: () => <span className="w-full flex justify-start">Mint</span>,
    cell: (info) => (
      <a href={`https://solscan.io/token/${info.getValue()}`} target="_blank" rel="noreferrer">
        {shortenAddress(info.getValue())}
      </a>
    ),
  }),
  columnHelper.accessor("staked_validator_count", {
    header: () => <span className="w-full flex justify-start"># Validators</span>,
    cell: (info) => <span className="flex justify-end">{info.getValue()}</span>,
  }),
  columnHelper.accessor(
    (row) => {
      return nativeToUi(row.active_lamports + row.deactivating_lamports, 9);
    },
    {
      id: "yielding_sol",
      header: () => <span className="w-full flex justify-start">Yielding (SOL)</span>,
      cell: (info) => <span className="flex justify-end">{numeralFormatter(info.getValue())}</span>,
    }
  ),
  columnHelper.accessor(
    (row) => {
      return (row.active_lamports + row.deactivating_lamports) / row.total_lamports_locked;
    },
    {
      id: "yielding_sol_percent",
      header: () => <span className="w-full flex justify-start">Yielding (%)</span>,
      cell: (info) => <span className="flex justify-end">{percentFormatter.format(info.getValue())}</span>,
    }
  ),
  columnHelper.accessor("apy_effective", {
    header: () => <span className="w-full flex justify-start">APY (effective)</span>,
    cell: (info) => (
      <span className="flex justify-end">
        {info.getValue() !== null ? percentFormatter.format(info.getValue()!) : "-"}
      </span>
    ),
  }),
  columnHelper.accessor("apy_baseline", {
    header: () => <span className="w-full flex justify-start">APY (proj)</span>,
    cell: (info) => <span className="flex justify-end">{percentFormatter.format(info.getValue())}</span>,
  }),
  columnHelper.accessor("inflation_rewards", {
    header: () => <span className="w-full flex justify-start">Native rewards (SOL)</span>,
    cell: (info) => (
      <span className="flex justify-end">{groupedNumberFormatter.format(nativeToUi(info.getValue(), 9))}</span>
    ),
  }),
  columnHelper.accessor("jito_rewards", {
    header: () => <span className="w-full flex justify-start">Jito rewards (SOL)</span>,
    cell: (info) => (
      <span className="flex justify-end">{groupedNumberFormatter.format(nativeToUi(info.getValue(), 9))}</span>
    ),
  }),
  columnHelper.accessor("management_fee", {
    header: () => <span className="w-full flex justify-start">Management fee (%)</span>,
    cell: (info) => <span className="flex justify-end">{percentFormatterDyn.format(info.getValue())}</span>,
  }),
];

const StakePoolDetailsTable: FC<{ stakePools: StakePoolStats[] }> = ({ stakePools }) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: stakePools,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  return (
    <div className="w-full p-2">
      <table className="w-full p-2">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : (
                    <div
                      {...{
                        className: header.column.getCanSort() ? "flex items-center cursor-pointer select-none" : "flex",
                        onClick: header.column.getToggleSortingHandler(),
                      }}
                    >
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      {{
                        asc: <span className="text-sm pl-3">&#9650;</span>,
                        desc: <span className="text-sm pl-3">&#9660;</span>,
                      }[header.column.getIsSorted() as string] ?? (
                        <span className="text-sm pl-3 text-transparent">&#9660;</span>
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {table.getFooterGroups().map((footerGroup) => (
            <tr key={footerGroup.id}>
              {footerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.footer, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </tfoot>
      </table>
      <div className="h-4" />
    </div>
  );
};

// --------- Bar chart config ---------

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

let epochApyDelayed: boolean;
export const options = {
  indexAxis: "x" as const,
  plugins: {
    title: {
      display: true,
      text: "Stake pool APY (%)",
    },
    tooltip: {
      callbacks: {},
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

const ApyBarChart: FC<{ stakePools: StakePoolStats[] }> = ({ stakePools }) => {
  const [sortByBaseline, setSortByBaseline] = useState<boolean>(true);

  const apyBarChartData = useMemo(() => {
    const stakePoolsSorted = stakePools.sort((stat1, stat2) => {
      if (sortByBaseline) {
        return stat2.apy_baseline - stat1.apy_baseline;
      } else {
        return stat2.apy_effective - stat1.apy_effective;
      }
    });

    const labels = stakePoolsSorted.map((stat) =>
      Object.keys(STAKE_POOLS_METAS).includes(stat.address)
        ? STAKE_POOLS_METAS[stat.address].name
        : shortenAddress(stat.mint)
    );
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

const AVERAGE_WINDOW = 5;

let averageApyDelayed: boolean;
export const averageApyOptions = {
  indexAxis: "x" as const,
  plugins: {
    title: {
      display: true,
      text: "Stake pool APY (%)",
    },
    tooltip: {
      callbacks: {},
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

const AverageApyBarChar: FC<{
  epochs: number[];
  historicalApys: Record<string, { effective: number; baseline: number }[]>;
}> = ({ epochs, historicalApys }) => {
  const [sortByBaseline, setSortByBaseline] = useState<boolean>(true);

  const averageApys = Object.entries(historicalApys)
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

const HistoricalApy: FC<{
  epochs: number[];
  historicalApys: Record<string, { effective: number; baseline: number }[]>;
}> = ({ epochs, historicalApys }) => {
  const [showBaseline, setShowBaseline] = useState<boolean>(true);

  const colors = chroma
    .scale(["#663399", "#00A86B"])
    .mode("lab")
    .colors(Object.keys(historicalApys).length)
    .map((color) => chroma(color).alpha(0.9).hex());
  const datasets = Object.entries(historicalApys)
    .sort(
      (a, b) =>
        a[1].reduce((sum, e) => {
          sum += showBaseline ? e.baseline : e.effective;
          return sum;
        }, 0) -
        b[1].reduce((sum, e) => {
          sum += showBaseline ? e.baseline : e.effective;
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
        data: spApys.map((apy) => (showBaseline ? apy.baseline : apy.effective * 100)),
        borderColor: chroma(colors[i]).darken().hex(),
        backgroundColor: colors[i],
      };
    });

  const historicalApyOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "left" as const,
      },
      title: {
        display: true,
        text: `Historical APY - ${showBaseline ? "baseline" : "effective"} (%)`,
      },
    },
    interaction: {
      mode: "point" as const,
    },
  };

  return (
    <div className="flex flex-col justify-start">
      <div className="flex justify-start gap-2 items-center">
        <MrgnContainedSwitch
          checked={showBaseline}
          onChange={(event) => {
            setShowBaseline(event.target.checked);
          }}
        />
        Show baseline APY
      </div>
      <Line
        options={historicalApyOptions}
        data={{
          labels: epochs,
          datasets: datasets,
        }}
      />
    </div>
  );
};

function makeHistoricalApyPerPool(
  availableEpochs: EpochStats[]
): [number[], Record<string, { effective: number; baseline: number }[]>] {
  const minEpoch = Math.min(...availableEpochs.map((epoch) => epoch.epoch));
  const maxEpoch = Math.max(...availableEpochs.map((epoch) => epoch.epoch));
  const allEpochs = Array.from({ length: maxEpoch - minEpoch + 1 }, (_, i) => i + minEpoch);
  const allStakePoolAddresses: string[] = [
    ...new Set(availableEpochs.flatMap((epoch) => epoch.stake_pools.map((sp) => sp.address))),
  ];

  const historicalApysPerPool: Record<string, { effective: number; baseline: number }[]> = {};
  allEpochs.forEach((epoch) => {
    const epochStats = availableEpochs.find((epochStats) => epochStats.epoch === epoch);
    if (!epochStats) {
      allStakePoolAddresses.forEach((spAddress) => {
        if (!historicalApysPerPool[spAddress]) historicalApysPerPool[spAddress] = [];
        historicalApysPerPool[spAddress].push({ effective: 0, baseline: 0 });
      });

      return;
    }

    allStakePoolAddresses.forEach((spAddress) => {
      const spStats = epochStats.stake_pools.find((sp) => sp.address === spAddress);
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
    } else if (historicalApysPerPool[spAddress].every((apy) => apy.baseline < 0.03 && apy.effective < 0.03)) {
      delete historicalApysPerPool[spAddress];
    }
  }

  return [allEpochs, historicalApysPerPool];
}
