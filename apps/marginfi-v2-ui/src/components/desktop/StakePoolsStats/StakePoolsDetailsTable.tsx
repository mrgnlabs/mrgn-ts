import { shortenAddress, nativeToUi, numeralFormatter, percentFormatter, percentFormatterDyn } from "@mrgnlabs/mrgn-common";
import { createColumnHelper, SortingState, useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from "@tanstack/react-table";
import { FC, useState } from "react";
import { StakePoolsStatsWithMeta } from "~/store/stakePoolStatsStore";

const columnHelper = createColumnHelper<StakePoolsStatsWithMeta>();
const columns = [
  columnHelper.accessor("name", {
    header: () => <span className="w-full flex justify-start">Address</span>,
    cell: (info) => (
      <a href={`https://solscan.io/account/${info.row.original.address}`} target="_blank" rel="noreferrer">
        {info.getValue()}
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
    header: () => <span className="w-full flex justify-start">APY (baseline)</span>,
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
    header: () => <span className="w-full flex justify-start">Management fee (%)</span>,
    cell: (info) => <span className="flex justify-end">{percentFormatterDyn.format(info.getValue())}</span>,
  }),
];

export const StakePoolDetailsTable: FC<{ stakePools: StakePoolsStatsWithMeta[] }> = ({ stakePools }) => {
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
