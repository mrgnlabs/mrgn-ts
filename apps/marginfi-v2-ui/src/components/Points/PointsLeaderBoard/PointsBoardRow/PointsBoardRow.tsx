import { FC } from "react";
import { TableCell, TableRow } from "@mui/material";

import { groupedNumberFormatterDyn } from "~/utils/formatters";
import * as models from "~/models";

export interface PointsBoardRowProps {
  row: models.LeaderboardRow;
  user: string;
}

export const PointsBoardRow: FC<PointsBoardRowProps> = ({ row, user }) => {
  const rank = row.rank ?? Number.MAX_VALUE;
  return (
    <TableRow key={row.id} className={`${row.id === user ? "glow" : ""} h-[68px]`}>
      <TableCell
        align="center"
        className={`${rank <= 2 ? "text-2xl" : "text-base"} border-none font-aeonik ${row.id === user ? "text-[#DCE85D]" : "text-white"
          }`}
      >
        {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : rank + 1}
      </TableCell>
      <TableCell
        className={`text-base border-none font-aeonik ${row.id === user ? "text-[#DCE85D]" : "text-white"}`}
        style={{ fontWeight: 400 }}
      >
        <a
          href={`https://solscan.io/account/${row.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", color: "inherit" }}
          className="glow-on-hover"
        >
          {`${row.id.slice(0, 5)}...${row.id.slice(-5)}`}
          <style jsx>{`
            a:hover {
              text-decoration: underline;
            }
          `}</style>
        </a>
      </TableCell>
      <TableCell
        align="right"
        className={`text-base border-none font-aeonik ${row.id === user ? "text-[#DCE85D]" : "text-white"}`}
        style={{ fontWeight: 400 }}
      >
        {groupedNumberFormatterDyn.format(Math.round(row.total_activity_deposit_points))}
      </TableCell>
      <TableCell
        align="right"
        className={`text-base border-none font-aeonik ${row.id === user ? "text-[#DCE85D]" : "text-white"}`}
        style={{ fontWeight: 400 }}
      >
        {groupedNumberFormatterDyn.format(Math.round(row.total_activity_borrow_points))}
      </TableCell>
      <TableCell
        align="right"
        className={`text-base border-none font-aeonik ${row.id === user ? "text-[#DCE85D]" : "text-white"}`}
        style={{ fontWeight: 400 }}
      >
        {groupedNumberFormatterDyn.format(
          Math.round(row.total_referral_deposit_points + row.total_referral_borrow_points)
        )}
      </TableCell>
      <TableCell
        align="right"
        className={`text-base border-none font-aeonik ${row.id === user ? "text-[#DCE85D]" : "text-white"}`}
        style={{ fontWeight: 400 }}
      >
        {groupedNumberFormatterDyn.format(Math.round(row.socialPoints ? row.socialPoints : 0))}
      </TableCell>
      <TableCell
        align="right"
        className={`text-base border-none font-aeonik ${row.id === user ? "text-[#DCE85D]" : "text-white"}`}
        style={{ fontWeight: 400 }}
      >
        {groupedNumberFormatterDyn.format(
          Math.round(row.total_deposit_points + row.total_borrow_points + (row.socialPoints ? row.socialPoints : 0))
        )}
      </TableCell>
    </TableRow>
  );
};
