import React, { FC } from "react";
import clsx from "clsx";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Typography,
} from "@mui/material";
import { groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { LeaderboardRow } from "@mrgnlabs/marginfi-v2-ui-state";

interface PointsLeaderBoardProps {
  leaderboardData: LeaderboardRow[] | {}[];
  currentUserId?: string;
}

export const PointsLeaderBoard: FC<PointsLeaderBoardProps> = ({ leaderboardData, currentUserId }) => {
  return (
    <TableContainer component={Paper} className="h-full w-4/5 sm:w-full bg-[#131619] rounded-xl overflow-x-auto">
      <Table>
        <TableHead>
          <TableRow className="bg-zinc-800">
            <TableCell
              align="center"
              className="text-white text-base font-aeonik font-bold border-none pl-2"
              style={{ fontWeight: 500 }}
            >
              Rank
            </TableCell>
            <TableCell className="text-white text-base font-aeonik border-none" style={{ fontWeight: 500 }}>
              User
            </TableCell>
            <TableCell
              className="text-white text-base font-aeonik border-none"
              align="right"
              style={{ fontWeight: 500 }}
            >
              Lending Points
            </TableCell>
            <TableCell
              className="text-white text-base font-aeonik border-none"
              align="right"
              style={{ fontWeight: 500 }}
            >
              Borrowing Points
            </TableCell>
            <TableCell
              className="text-white text-base font-aeonik border-none"
              align="right"
              style={{ fontWeight: 500 }}
            >
              Referral Points
            </TableCell>
            <TableCell
              className="text-white text-base font-aeonik border-none"
              align="right"
              style={{ fontWeight: 500 }}
            >
              Social Points
            </TableCell>
            <TableCell
              className="text-white text-base font-aeonik border-none"
              align="right"
              style={{ fontWeight: 500 }}
            >
              Total Points
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leaderboardData.map((row: LeaderboardRow | {}, index: number) => {
            if (!row.hasOwnProperty("id")) {
              return (
                <TableRow key={index}>
                  {[...new Array(7)].map((_, index) => (
                    <TableCell className="border-none">
                      <Skeleton variant="text" animation="pulse" sx={{ fontSize: "1rem", bgcolor: "grey.900" }} />
                    </TableCell>
                  ))}
                </TableRow>
              );
            }

            const data = row as LeaderboardRow;

            return (
              <TableRow
                key={data.id}
                className={clsx(
                  (index & 1) > 0 ? "bg-zinc-800/50" : "bg-none",
                  `${data.id === currentUserId ? "glow" : ""}`
                )}
              >
                <TableCell
                  align="center"
                  className={`${index <= 2 ? "text-2xl" : "text-base"} border-none font-aeonik ${
                    data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                  }`}
                >
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                </TableCell>
                <TableCell
                  className={`text-base border-none font-aeonik ${
                    data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                  }`}
                  style={{ fontWeight: 400 }}
                >
                  <a
                    href={`https://solscan.io/account/${data.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "inherit" }}
                    className="hover:text-[#7fff00]"
                  >
                    {`${data.id.slice(0, 5)}...${data.id.slice(-5)}`}
                    <style jsx>{`
                      a:hover {
                        text-decoration: underline;
                      }
                    `}</style>
                  </a>
                </TableCell>
                <TableCell
                  align="right"
                  className={`text-sm border-none font-mono ${
                    data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                  }`}
                  style={{ fontWeight: 400 }}
                >
                  {groupedNumberFormatterDyn.format(Math.round(data.total_activity_deposit_points))}
                </TableCell>
                <TableCell
                  align="right"
                  className={`text-sm border-none font-mono ${
                    data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                  }`}
                  style={{ fontWeight: 400 }}
                >
                  {groupedNumberFormatterDyn.format(Math.round(data.total_activity_borrow_points))}
                </TableCell>
                <TableCell
                  align="right"
                  className={`text-sm border-none font-mono ${
                    data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                  }`}
                  style={{ fontWeight: 400 }}
                >
                  {groupedNumberFormatterDyn.format(
                    Math.round(data.total_referral_deposit_points + data.total_referral_borrow_points)
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  className={`text-sm border-none font-mono ${
                    data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                  }`}
                  style={{ fontWeight: 400 }}
                >
                  {groupedNumberFormatterDyn.format(Math.round(data.socialPoints ? data.socialPoints : 0))}
                </TableCell>
                <TableCell
                  align="right"
                  className={`text-sm border-none font-mono ${
                    data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                  }`}
                  style={{ fontWeight: 400 }}
                >
                  {groupedNumberFormatterDyn.format(
                    Math.round(
                      data.total_deposit_points + data.total_borrow_points + (data.socialPoints ? data.socialPoints : 0)
                    )
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
