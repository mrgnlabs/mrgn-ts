import React, { FC } from "react";
import { TableRow } from "@mui/material";

interface TableHeaderProps {
    config: {
        colNames: string[];
        cellStyling: string;
    }
}

const TableHeader: FC<TableHeaderProps> = ({ config }) => (
  <TableRow className="w-full flex">
    <div
      className={`text-[#cacaca] h-14 p-0 ${config.cellStyling} flex items-center pl-[2%] text-sm`}
      style={{
        fontWeight: 300,
        whiteSpace: 'nowrap',
      }}
    >
    </div>
    {
      config.colNames.map(
        header => (
          <div
            className={`text-[#cacaca] h-14 p-0 ${config.cellStyling} flex items-center pl-6 text-sm`}
            style={{
              fontWeight: 300,
              whiteSpace: 'nowrap',
            }}
          >
            {header}
          </div>
        )
      )
    }
  </TableRow>
)

export { TableHeader };
