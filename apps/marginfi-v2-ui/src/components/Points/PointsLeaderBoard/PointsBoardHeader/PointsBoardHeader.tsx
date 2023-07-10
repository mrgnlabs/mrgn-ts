import { TableHead, TableRow, TableCell, Checkbox, TableSortLabel, Box } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { headCells } from "./PointsBoardHeader.consts";

type Order = "asc" | "desc";

interface EnhancedTableProps {
  onRequestSort: (event: React.MouseEvent<unknown>, property: any) => void;
  order: Order;
  orderBy: string;
}

export const EnhancedTableHead = (props: EnhancedTableProps) => {
  const { order, orderBy, onRequestSort } = props;
  const createSortHandler = (property: any) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            className="text-white text-base font-aeonik border-none"
            style={{ fontWeight: 500 }}
            align={headCell.numeric ? "right" : "left"}
            padding={headCell.disablePadding ? "none" : "normal"}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              sx={{
                "& .MuiTableSortLabel-icon": {
                  color: "white !important",
                  opacity: 0.6,
                  position: `${headCell.numeric ? "absolute" : "relative"}`,
                  right: `${headCell.numeric ? "-28px" : "unset"}`,
                },
              }}
              className="text-white text-base font-aeonik border-none"
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : "asc"}
              disabled={headCell.id === "rank"}
              hideSortIcon={headCell.id === "rank" ? true : false}
              onClick={createSortHandler(headCell.id)}
            >
              <span className="text-white text-base font-aeonik border-none">{headCell.label}</span>
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === "desc" ? "sorted descending" : "sorted ascending"}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};
