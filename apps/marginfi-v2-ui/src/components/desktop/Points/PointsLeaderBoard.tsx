import React, { FC, useEffect, useState, useCallback, useRef, useMemo } from "react";
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
import { LeaderboardRow, fetchLeaderboardData, fetchTotalUserCount } from "@mrgnlabs/marginfi-v2-ui-state";
import { useConnection } from "@solana/wallet-adapter-react";

interface PointsLeaderBoardProps {
  currentUserId?: string;
}

export const PointsLeaderBoard: FC<PointsLeaderBoardProps> = ({ currentUserId }) => {
  const { connection } = useConnection();
  const [leaderboardSettings, setLeaderboardSettings] = useState<{
    orderCol: string;
    orderDir: "asc" | "desc";
    totalUserCount: number;
    perPage: number;
    currentPage: number;
    isFetchingLeaderboardPage: boolean;
    initialLoad: boolean;
  }>({
    orderCol: "total_points",
    orderDir: "desc",
    totalUserCount: 0,
    perPage: 50,
    currentPage: 0,
    isFetchingLeaderboardPage: false,
    initialLoad: true,
  });
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardRow[] | {}[]>([
    ...new Array(leaderboardSettings.perPage).fill({}),
  ]);
  const leaderboardSentinelRef = useRef<HTMLDivElement>(null);

  const getTotalUserCount = useCallback(async () => {
    const totalUserCount = await fetchTotalUserCount();
    setLeaderboardSettings({
      ...leaderboardSettings,
      totalUserCount,
    });
  }, [setLeaderboardSettings, fetchTotalUserCount]);

  // fetch next page of leaderboard results
  const fetchLeaderboardPage = useCallback(async () => {
    // grab last row of current leaderboard data for cursor
    const lastRow = [...leaderboardData].filter((row) => row.hasOwnProperty("id"))[
      leaderboardSettings.currentPage * leaderboardSettings.perPage - (leaderboardSettings.orderDir === "asc" ? 1 : 2)
    ] as LeaderboardRow;
    if (!lastRow || !lastRow.hasOwnProperty("id")) return;
    setLeaderboardSettings({
      ...leaderboardSettings,
      isFetchingLeaderboardPage: true,
    });

    // fetch new page of data with cursor
    const queryCursor = leaderboardData.length > 0 ? lastRow.doc : undefined;
    setLeaderboardData((current) => [...current, ...new Array(50).fill({})]);
    fetchLeaderboardData({
      connection,
      queryCursor,
      orderDir: leaderboardSettings.orderDir,
    }).then((data) => {
      // filter out skeleton rows
      const filtered = [...leaderboardData].filter((row) => row.hasOwnProperty("id"));

      // additional check for duplicate values
      const uniqueData = data.reduce((acc, curr) => {
        const isDuplicate = acc.some((item) => {
          const data = item as LeaderboardRow;
          data.id === curr.id;
        });
        if (!isDuplicate) {
          acc.push(curr);
        }
        return acc;
      }, filtered);

      setLeaderboardData(uniqueData);
      setLeaderboardSettings({
        ...leaderboardSettings,
        isFetchingLeaderboardPage: false,
      });
    });
  }, [setLeaderboardData, leaderboardSettings, setLeaderboardSettings]);

  // fetch new page when page counter changed
  useEffect(() => {
    fetchLeaderboardPage();
  }, [leaderboardSettings.currentPage]);

  useEffect(() => {
    // fetch initial page and overwrite skeleton rows
    if (leaderboardSettings.currentPage === 0 && leaderboardSettings.initialLoad) {
      setLeaderboardSettings({
        ...leaderboardSettings,
        initialLoad: false,
      });
      fetchLeaderboardData({
        connection,
        orderDir: leaderboardSettings.orderDir,
        orderCol: leaderboardSettings.orderCol,
      }).then((data) => {
        setLeaderboardData([...data]);
      });
    }

    // intersection observer to fetch new page of data
    // when sentinel element is scrolled into view
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !leaderboardSettings.isFetchingLeaderboardPage) {
          setLeaderboardSettings({
            ...leaderboardSettings,
            isFetchingLeaderboardPage: true,
            currentPage: leaderboardSettings.currentPage + 1,
          });
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0,
      }
    );

    if (leaderboardSentinelRef.current) {
      observer.observe(leaderboardSentinelRef.current);
    }

    return () => {
      if (leaderboardSentinelRef.current) {
        observer.unobserve(leaderboardSentinelRef.current);
      }
    };
  }, [
    connection,
    fetchLeaderboardPage,
    setLeaderboardSettings,
    leaderboardSettings.isFetchingLeaderboardPage,
    leaderboardSettings.currentPage,
    leaderboardSettings.initialLoad,
    setLeaderboardSettings,
  ]);

  useEffect(() => {
    getTotalUserCount();
  }, []);

  return (
    <>
      <p>Total users: {leaderboardSettings.totalUserCount}</p>
      <TableContainer
        component={Paper}
        className="h-full w-4/5 mt-10 sm:w-full bg-[#131619] rounded-xl overflow-x-auto"
      >
        <Table>
          <TableHead>
            <TableRow className="bg-zinc-800">
              <TableCell
                align="center"
                className="text-white text-base font-aeonik font-bold border-none text-center cursor-pointer"
                style={{ fontWeight: 500 }}
                onClick={() => {
                  setLeaderboardData([...new Array(leaderboardSettings.perPage).fill({})]);
                  setLeaderboardSettings({
                    ...leaderboardSettings,
                    orderCol: "total_points",
                    orderDir: leaderboardSettings.orderDir === "asc" ? "desc" : "asc",
                    currentPage: 0,
                    initialLoad: true,
                  });
                }}
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
                    className={clsx(
                      "border-none font-mono",
                      leaderboardSettings.orderCol === "total_points" &&
                        leaderboardSettings.orderDir === "desc" &&
                        index <= 2 &&
                        "text-2xl",
                      leaderboardSettings.orderCol === "total_points" &&
                        leaderboardSettings.orderDir === "desc" &&
                        index > 2 &&
                        "text-base",
                      leaderboardSettings.orderCol !== "total_points" && "text-base",
                      data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    )}
                  >
                    {leaderboardSettings.orderCol === "total_points" && leaderboardSettings.orderDir === "desc" && (
                      <>{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</>
                    )}
                    {leaderboardSettings.orderCol === "total_points" && leaderboardSettings.orderDir === "asc" && (
                      <>{leaderboardSettings.totalUserCount - index}</>
                    )}
                    {leaderboardSettings.orderCol !== "total_points" && <>{index}</>}
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
                      className="hover:text-[#DCE85D]"
                    >
                      {data.id}
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
                        data.total_deposit_points +
                          data.total_borrow_points +
                          (data.socialPoints ? data.socialPoints : 0)
                      )
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <div ref={leaderboardSentinelRef} style={{ height: 10, width: "100%" }} />
    </>
  );
};
