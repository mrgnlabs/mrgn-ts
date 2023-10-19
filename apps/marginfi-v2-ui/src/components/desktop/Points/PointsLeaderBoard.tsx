import React, { FC, useEffect, useState, useCallback, useRef } from "react";
import clsx from "clsx";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Skeleton } from "@mui/material";
import { groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { LeaderboardRow, fetchLeaderboardData, fetchTotalUserCount } from "@mrgnlabs/marginfi-v2-ui-state";
import { useConnection } from "@solana/wallet-adapter-react";
import { shortenAddress } from "@mrgnlabs/mrgn-common";

const SortIcon = ({ orderDir }: { orderDir: "asc" | "desc" }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <svg width="12" height="6" viewBox="0 0 16 8" fill="white" className={clsx(orderDir !== "asc" && "opacity-50")}>
        <path d="M8 6.55671e-07L0.500001 8L15.5 8L8 6.55671e-07Z" />
      </svg>

      <svg width="12" height="6" viewBox="0 0 16 8" fill="white" className={clsx(orderDir !== "desc" && "opacity-50")}>
        <path d="M8 8L0.500001 -1.31134e-06L15.5 0L8 8Z" />
      </svg>
    </div>
  );
};

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
  }>({
    orderCol: "total_points",
    orderDir: "desc",
    totalUserCount: 0,
    perPage: 50,
  });
  const [leaderboardPage, setLeaderboardPage] = useState<number>(0);

  // prefill leaderboard data with empty rows for skeleton loading
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardRow[] | {}[]>([
    ...new Array(leaderboardSettings.perPage).fill({}),
  ]);
  // sentinel element to trigger fetch of new page on scroll
  const leaderboardSentinelRef = useRef<HTMLDivElement>(null);

  // set order column and direction
  const setOrderCol = useCallback(
    (col: string) => {
      setLeaderboardData([...new Array(leaderboardSettings.perPage).fill({})]);
      const direction =
        col === leaderboardSettings.orderCol ? (leaderboardSettings.orderDir === "asc" ? "desc" : "asc") : "desc";
      setLeaderboardSettings({
        ...leaderboardSettings,
        orderCol: col,
        orderDir: direction,
      });
      setLeaderboardPage(0);
    },
    [setLeaderboardSettings, leaderboardSettings, setLeaderboardPage]
  );

  const getTotalUserCount = useCallback(async () => {
    const totalUserCount = await fetchTotalUserCount();
    setLeaderboardSettings((current) => ({ ...current, totalUserCount }));
  }, [setLeaderboardSettings]);

  // fetch next page of leaderboard results
  const fetchLeaderboardPage = useCallback(async () => {
    // grab last row of current leaderboard data for cursor
    const filtered = [...leaderboardData].filter((row) => row.hasOwnProperty("id"));
    const lastRow = filtered[filtered.length - 1] as LeaderboardRow;
    if (!lastRow || !lastRow.hasOwnProperty("id")) return;

    // fetch new page of data with cursor
    const queryCursor = leaderboardData.length > 0 ? lastRow.doc : undefined;
    setLeaderboardData((current) => [...current, ...new Array(50).fill({})]);
    fetchLeaderboardData({
      connection,
      queryCursor,
      orderCol: leaderboardSettings.orderCol,
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
    });
  }, [connection, setLeaderboardData, leaderboardData, leaderboardSettings]);

  // fetch initial page and overwrite skeleton rows
  const fetchInitialPage = useCallback(async () => {
    fetchLeaderboardData({
      connection,
      orderDir: leaderboardSettings.orderDir,
      orderCol: leaderboardSettings.orderCol,
    }).then((data) => {
      setLeaderboardData([...data]);
    });
  }, [connection, setLeaderboardData, leaderboardSettings.orderDir, leaderboardSettings.orderCol]);

  // fetch new page of data when intersewction observer fires
  const handlerIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) {
        setLeaderboardPage((current) => current + 1);
      }
    },
    [setLeaderboardPage]
  );

  // fetch new page when page counter changed
  useEffect(() => {
    fetchLeaderboardPage();
    // must not include fetchLeaderboardPage to avoid infinite loop
    // this is because fetchLeaderboardPage depends on leaderboardData AND effects leaderboardData
    // TODO: refactor to avoid this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderboardPage]);

  // on page load fetch initial page, total user count, and configure
  useEffect(() => {
    fetchInitialPage();
    getTotalUserCount();

    const sentinel = leaderboardSentinelRef.current;

    // intersection observer to fetch new page of data
    // when sentinel element is scrolled into view
    const observer = new IntersectionObserver(handlerIntersection);

    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [fetchInitialPage, getTotalUserCount, handlerIntersection]);

  return (
    <>
      <TableContainer
        component={Paper}
        className="h-full w-full mt-10 sm:w-full bg-[#131619] rounded-xl overflow-x-auto"
      >
        <Table>
          <TableHead>
            <TableRow className="bg-zinc-800">
              <TableCell
                align="center"
                className="text-white text-base font-aeonik border-none cursor-pointer"
                onClick={() => setOrderCol("total_points")}
              >
                Rank
              </TableCell>
              <TableCell className="text-white text-base font-aeonik border-none">User</TableCell>
              <TableCell
                className={clsx(
                  "text-white text-base font-aeonik border-none cursor-pointer",
                  leaderboardSettings.orderCol === "total_activity_deposit_points" &&
                    "flex flex-row items-center justify-end gap-3"
                )}
                align="right"
                onClick={() => setOrderCol("total_activity_deposit_points")}
              >
                Lending Points
                {leaderboardSettings.orderCol === "total_activity_deposit_points" && (
                  <SortIcon orderDir={leaderboardSettings.orderDir} />
                )}
              </TableCell>
              <TableCell
                className={clsx(
                  "text-white text-base font-aeonik border-none cursor-pointer",
                  leaderboardSettings.orderCol === "total_activity_borrow_points" &&
                    "flex flex-row items-center justify-end gap-3"
                )}
                align="right"
                onClick={() => setOrderCol("total_activity_borrow_points")}
              >
                Borrowing Points
                {leaderboardSettings.orderCol === "total_activity_borrow_points" && (
                  <SortIcon orderDir={leaderboardSettings.orderDir} />
                )}
              </TableCell>
              <TableCell className="text-white text-base font-aeonik border-none" align="right">
                Referral Points
              </TableCell>
              <TableCell
                className={clsx(
                  "text-white text-base font-aeonik border-none cursor-pointer",
                  leaderboardSettings.orderCol === "socialPoints" && "flex flex-row items-center justify-end gap-3"
                )}
                align="right"
                onClick={() => setOrderCol("socialPoints")}
              >
                Social Points
                {leaderboardSettings.orderCol === "socialPoints" && (
                  <SortIcon orderDir={leaderboardSettings.orderDir} />
                )}
              </TableCell>
              <TableCell
                align="right"
                className={clsx(
                  "text-white text-base font-aeonik border-none cursor-pointer",
                  leaderboardSettings.orderCol === "total_points" && "flex flex-row items-center justify-end gap-3"
                )}
                onClick={() => setOrderCol("total_points")}
              >
                Total Points
                {leaderboardSettings.orderCol === "total_points" && (
                  <SortIcon orderDir={leaderboardSettings.orderDir} />
                )}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaderboardData.map((row: LeaderboardRow | {}, index: number) => {
              if (!row.hasOwnProperty("id")) {
                return (
                  <TableRow key={index}>
                    {[...new Array(7)].map((_, index) => (
                      <TableCell
                        className={clsx(
                          "border-none",
                          index === 0 && "w-[10%]",
                          index === 1 && "w-[15%] min-w-[190px]",
                          index > 1 && "w-[15%] min-w-[190px]"
                        )}
                        key={index}
                      >
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
                      "border-none font-mono w-[10%]",
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
                    {leaderboardSettings.orderCol !== "total_points" && leaderboardSettings.orderDir === "desc" && (
                      <>{index + 1}</>
                    )}
                    {leaderboardSettings.orderDir === "asc" && <>{leaderboardSettings.totalUserCount - (index + 1)}</>}
                  </TableCell>
                  <TableCell
                    className={clsx(
                      "text-base border-none font-aeonik w-[15%] min-w-[190px]",
                      data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    )}
                  >
                    <a
                      href={`https://solscan.io/account/${data.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "inherit" }}
                      className={clsx(
                        "hover:text-[#DCE85D] hover:opacity-100 transition",
                        data.domain && "font-bold",
                        !data.domain && "opacity-80 font-mono text-sm"
                      )}
                    >
                      {data.domain || shortenAddress(data.id)}
                    </a>
                  </TableCell>
                  <TableCell
                    align="right"
                    className={clsx(
                      "border-none font-mono text-sm w-[15%] min-w-[190px]",
                      data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    )}
                  >
                    {groupedNumberFormatterDyn.format(Math.round(data.total_activity_deposit_points))}
                  </TableCell>
                  <TableCell
                    align="right"
                    className={clsx(
                      "border-none font-mono text-sm w-[15%] min-w-[190px]",
                      data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    )}
                  >
                    {groupedNumberFormatterDyn.format(Math.round(data.total_activity_borrow_points))}
                  </TableCell>
                  <TableCell
                    align="right"
                    className={clsx(
                      "border-none font-mono text-sm w-[15%] min-w-[190px]",
                      data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    )}
                  >
                    {groupedNumberFormatterDyn.format(
                      Math.round(data.total_referral_deposit_points + data.total_referral_borrow_points)
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    className={clsx(
                      "border-none font-mono text-sm w-[15%] min-w-[190px]",
                      data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    )}
                  >
                    {groupedNumberFormatterDyn.format(Math.round(data.socialPoints ? data.socialPoints : 0))}
                  </TableCell>
                  <TableCell
                    align="right"
                    className={clsx(
                      "border-none font-mono text-sm w-[15%] min-w-[190px]",
                      data.id === currentUserId ? "text-[#DCE85D]" : "text-white"
                    )}
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
