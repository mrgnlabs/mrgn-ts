import { FC, useMemo, useState } from "react";
import { Paper, Table, TableBody, TableContainer, TablePagination } from "@mui/material";

import * as models from "~/models";
import { EnhancedTableHead } from "./PointsBoardHeader";
import { PointsBoardRow } from "./PointsBoardRow";

interface PointsLeaderBoardProps {
  leaderboardData: models.LeaderboardRow[];
  user: string;
}

type Order = "asc" | "desc";

export const PointsLeaderBoard: FC<PointsLeaderBoardProps> = ({ leaderboardData, user }) => {
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<string>("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof models.LeaderboardRow) => {
    const isAsc = orderBy === property && order === "desc";
    setOrder(isAsc ? "asc" : "desc");
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Avoid a layout jump when reaching the last page with empty rows. TODO
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - leaderboardData.length) : 0;

  const visibleRows = useMemo(
    () =>
      stableSort(leaderboardData, getComparator(order, orderBy)).slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [order, orderBy, page, rowsPerPage, leaderboardData]
  ) as models.LeaderboardRow[];

  return (
    <TableContainer
      component={Paper}
      className="h-full w-4/5 sm:w-full bg-[#131619] rounded-xl overflow-x-auto px-4 py-3"
    >
      <Table>
        <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} />

        <TableBody>
          {visibleRows.map((item: models.LeaderboardRow, key: number) => (
            <PointsBoardRow row={item} key={key} user={user} />
          ))}
        </TableBody>
      </Table>
      <TablePagination
        sx={{
          "& .MuiToolbar-root": {
            color: "white !important",
          },
        }}
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={leaderboardData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );
};

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key
): (a: { [key in Key]: number | string }, b: { [key in Key]: number | string }) => number {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// Since 2020 all major browsers ensure sort stability with Array.prototype.sort().
// stableSort() brings sort stability to non-modern browsers (notably IE11). If you
// only support modern browsers you can replace stableSort(exampleArray, exampleComparator)
// with exampleArray.slice().sort(exampleComparator)
function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}
