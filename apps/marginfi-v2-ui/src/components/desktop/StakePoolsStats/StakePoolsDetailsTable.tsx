import {
  shortenAddress,
  nativeToUi,
  numeralFormatter,
  percentFormatter,
  percentFormatterDyn,
} from "@mrgnlabs/mrgn-common";
import {
  createColumnHelper,
  SortingState,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { FC, useState } from "react";
import { StakePoolStatsWithMeta } from "~/store/stakePoolStatsStore";

const columnHelper = createColumnHelper<StakePoolStatsWithMeta>();
const columns = [
  columnHelper.accessor("name", {
    header: () => <span className="w-full flex justify-start">Address</span>,
    cell: (info) => (
      <a href={`https://solscan.io/account/${info.row.original.address}`} target="_blank" rel="noreferrer">
        <div className="w-[100px] truncate">{info.getValue()}</div>
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
    header: () => <span className="w-full flex justify-end"># Validators</span>,
    cell: (info) => <span className="flex justify-end">{info.getValue()}</span>,
  }),
  columnHelper.accessor(
    (row) => {
      return nativeToUi(row.active_lamports + row.deactivating_lamports, 9);
    },
    {
      id: "yielding_sol",
      header: () => <span className="w-full flex justify-end">Yielding (SOL)</span>,
      cell: (info) => <span className="flex justify-end">{numeralFormatter(info.getValue())}</span>,
    }
  ),
  columnHelper.accessor(
    (row) => {
      return (row.active_lamports + row.deactivating_lamports) / row.total_lamports_locked;
    },
    {
      id: "yielding_sol_percent",
      header: () => <span className="w-full flex justify-end">Yielding (%)</span>,
      cell: (info) => <span className="flex justify-end">{percentFormatter.format(info.getValue())}</span>,
    }
  ),
  columnHelper.accessor("apy_effective", {
    header: () => <span className="w-full flex justify-end">APY (effective)</span>,
    cell: (info) => (
      <span className="flex justify-end">
        {info.getValue() !== null ? percentFormatter.format(info.getValue()!) : "-"}
      </span>
    ),
  }),
  columnHelper.accessor("apy_baseline", {
    header: () => <span className="w-full flex justify-end">APY (baseline)</span>,
    cell: (info) => <span className="flex justify-end">{percentFormatter.format(info.getValue())}</span>,
  }),
  // columnHelper.accessor("inflation_rewards", {
  //   header: () => <span className="w-full flex justify-start">Native rewards (SOL)</span>,
  //   cell: (info) => (
  //     <span className="flex justify-end">{groupedNumberFormatter.format(nativeToUi(info.getValue(), 9))}</span>
  //   ),
  // }),
  // columnHelper.accessor("jito_rewards", {
  //   header: () => <span className="w-full flex justify-start">Jito rewards (SOL)</span>,
  //   cell: (info) => (
  //     <span className="flex justify-end">{groupedNumberFormatter.format(nativeToUi(info.getValue(), 9))}</span>
  //   ),
  // }),
  columnHelper.accessor("management_fee", {
    header: () => <span className="w-full flex justify-end">Management fee (%)</span>,
    cell: (info) => <span className="flex justify-end">{percentFormatterDyn.format(info.getValue())}</span>,
  }),
];

export const StakePoolDetailsTable: FC<{ stakePools: StakePoolStatsWithMeta[] }> = ({ stakePools }) => {
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
      <table className="w-full p-2 text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-zinc-700 text-white">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="font-medium px-2 py-3">
                  {header.isPlaceholder ? null : (
                    <div
                      {...{
                        className: header.column.getCanSort() ? "flex items-center cursor-pointer select-none" : "flex",
                        onClick: header.column.getToggleSortingHandler(),
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {
                        {
                          asc: <span className="text-sm pl-3">&#9650;</span>,
                          desc: <span className="text-sm pl-3">&#9660;</span>,
                        }[header.column.getIsSorted() as string]
                      }
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="even:bg-zinc-800">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-2 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
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
