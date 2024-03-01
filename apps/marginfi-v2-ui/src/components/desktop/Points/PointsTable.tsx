import React from "react";

import Link from "next/link";

import { PublicKey } from "@solana/web3.js";
import { useDebounce } from "@uidotdev/usehooks";
import { getDomainKeySync, NameRegistryState } from "@bonfida/spl-name-service";
import {
  fetchLeaderboardData,
  fetchTotalLeaderboardCount,
  LeaderboardRow,
  LeaderboardSettings,
  UserPointsData,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { groupedNumberFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";

import { useConnection } from "~/hooks/useConnection";
import { cn } from "~/utils";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/ui/loader";
import {
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconLoader,
  IconX,
  IconBackpackWallet,
} from "~/components/ui/icons";

type PointsTableProps = {
  userPointsData: UserPointsData;
};

type PointsTableHeaderButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  orderCol?: TableOrderCol;
  currentOrderCol: TableOrderCol;
  currentOrderDir: TableOrderDirection;
  noActiveState?: boolean;
  className?: string;
};

enum PointsTableState {
  Loading = "loading",
  Working = "working",
  Ready = "ready",
}

enum TableOrderCol {
  Address = "owner",
  DepositPoints = "total_deposit_points",
  BorrowPoints = "total_borrow_points",
  ReferralPoints = "total_referral_points",
  TotalPoints = "total_points",
}

enum TableOrderDirection {
  Asc = "asc",
  Desc = "desc",
}

const PointsTableHeaderItems = [
  {
    label: "Rank",
    orderCol: TableOrderCol.TotalPoints,
    noActiveState: true,
  },
  {
    label: "Address",
  },
  {
    label: "Deposit Points",
    orderCol: TableOrderCol.DepositPoints,
  },
  {
    label: "Borrow Points",
    orderCol: TableOrderCol.BorrowPoints,
  },
  {
    label: "Referral Points",
    orderCol: TableOrderCol.ReferralPoints,
  },
  {
    label: "Total Points",
    orderCol: TableOrderCol.TotalPoints,
  },
];

const PointsTableHeaderButton = ({
  children,
  onClick,
  orderCol,
  currentOrderCol,
  currentOrderDir,
  noActiveState = false,
  className,
}: PointsTableHeaderButtonProps) => {
  return (
    <button
      className={cn("flex items-center gap-0.5", currentOrderCol !== orderCol && "cursor-pointer", className)}
      onClick={onClick}
    >
      {currentOrderCol === orderCol && currentOrderDir === TableOrderDirection.Desc && !noActiveState && (
        <IconSortDescending className="mr-1" size={15} />
      )}
      {currentOrderCol === orderCol && currentOrderDir === TableOrderDirection.Asc && !noActiveState && (
        <IconSortAscending className="mr-1" size={15} />
      )}
      {children}
    </button>
  );
};

export const PointsTable = ({ userPointsData }: PointsTableProps) => {
  const { connection } = useConnection();
  const [pointsTableState, setPointsTableState] = React.useState<PointsTableState>(PointsTableState.Loading);
  const [leaderboardData, setLeaderboardData] = React.useState<LeaderboardRow[]>([]);
  const [leaderboardCount, setLeaderboardCount] = React.useState<number>(0);
  const [leaderboardSettings, setLeaderboardSettings] = React.useState<LeaderboardSettings>({
    pageSize: 100,
    currentPage: 1,
    orderCol: TableOrderCol.TotalPoints,
    orderDir: TableOrderDirection.Desc,
    search: "",
  });
  const leaderboardSearchRef = React.useRef<HTMLInputElement>(null);
  const debouncedLeaderboardSettings = useDebounce(leaderboardSettings, 500);

  // debounced callback on leaderboard settings changes
  // used to fetch new data for sorting, searching, and pagination
  React.useEffect(() => {
    const getLeaderboardData = async () => {
      setPointsTableState(PointsTableState.Working);

      const newLeaderboardSettings = { ...debouncedLeaderboardSettings };

      // convert .sol domain to wallet address
      let pk = debouncedLeaderboardSettings.search;
      if (debouncedLeaderboardSettings.search && debouncedLeaderboardSettings.search.includes(".sol")) {
        const { pubkey } = getDomainKeySync(debouncedLeaderboardSettings.search);
        const { registry } = await NameRegistryState.retrieve(connection, pubkey);

        pk = registry.owner.toBase58();
        newLeaderboardSettings.search = pk;
      }

      // fetch new leaderboard data
      const data = await fetchLeaderboardData(connection, newLeaderboardSettings);
      if (data && data.length > 0) {
        setLeaderboardData([...data]);
      }

      setPointsTableState(PointsTableState.Ready);
    };

    getLeaderboardData();

    // intentionally ignore connection as it causes firebase network request loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLeaderboardSettings]);

  // separate call for leaderboard count as this request can be slow
  // only required for total page count
  React.useEffect(() => {
    if (leaderboardCount > 0) return;
    const getLeaderboardCount = async () => {
      const count = await fetchTotalLeaderboardCount();
      setLeaderboardCount(count);
    };

    getLeaderboardCount();
  }, [leaderboardCount]);

  if (!leaderboardData) {
    return <Loader label="Loading points leaderboard..." className="mt-8" />;
  }

  return (
    <div className="w-full mt-10 space-y-3 pb-16">
      <div className="flex items-center gap-2 justify-between">
        <div className="relative max-w-xl w-full">
          <IconSearch className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" size={15} />
          <Input
            ref={leaderboardSearchRef}
            type="text"
            placeholder="Search by wallet address, .sol domain, or rank..."
            className="w-full rounded-full pl-9"
            onChange={(e) =>
              setLeaderboardSettings({
                ...leaderboardSettings,
                search: e.target.value,
                currentPage: 1,
              })
            }
            value={leaderboardSettings.search}
          />
          {leaderboardSettings.search && leaderboardSettings.search.length > 0 && (
            <button
              onClick={() => {
                setLeaderboardSettings({
                  pageSize: 100,
                  currentPage: 1,
                  orderCol: TableOrderCol.TotalPoints,
                  orderDir: TableOrderDirection.Desc,
                  search: "",
                });
              }}
              className="flex items-center gap-1 text-xs absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white"
            >
              <IconX size={14} className="translate-y-[1px]" /> clear search
            </button>
          )}
        </div>
      </div>
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            {PointsTableHeaderItems.map((item) => (
              <TableHead
                key={item.label}
                className={cn(
                  "w-[100px] text-left",
                  leaderboardSettings.orderCol === item.orderCol &&
                    !leaderboardSettings.search &&
                    item.label !== "Rank" &&
                    "text-white",
                  item.orderCol === TableOrderCol.TotalPoints && item.label !== "Rank" && "text-right"
                )}
              >
                <PointsTableHeaderButton
                  orderCol={item.orderCol}
                  currentOrderCol={leaderboardSettings.orderCol as TableOrderCol}
                  currentOrderDir={leaderboardSettings.orderDir as TableOrderDirection}
                  className={cn(
                    item.orderCol === TableOrderCol.TotalPoints && item.label !== "Rank" && "text-right ml-auto"
                  )}
                  noActiveState={item.noActiveState}
                  onClick={
                    item.orderCol
                      ? () => {
                          if (pointsTableState !== PointsTableState.Ready) return;
                          setPointsTableState(PointsTableState.Working);

                          let orderDir = leaderboardSettings.orderDir;

                          if (leaderboardSettings.orderCol !== item.orderCol) {
                            orderDir = TableOrderDirection.Desc;
                          } else {
                            orderDir =
                              leaderboardSettings.orderDir === TableOrderDirection.Asc
                                ? TableOrderDirection.Desc
                                : TableOrderDirection.Asc;
                          }
                          setLeaderboardSettings({
                            ...leaderboardSettings,
                            orderCol: item.orderCol,
                            orderDir,
                            currentPage: 1,
                          });
                        }
                      : undefined
                  }
                >
                  {item.label}
                </PointsTableHeaderButton>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        {pointsTableState === PointsTableState.Loading && (
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                <div className="flex items-center justify-center gap-1.5 py-4 text-muted-foreground">
                  <IconLoader className="animate-spin" size={20} /> Loading leaderboard...
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        )}
        {pointsTableState !== PointsTableState.Loading && (
          <TableBody className={cn(pointsTableState === PointsTableState.Working && "opacity-25")}>
            {leaderboardData.map((leaderboardRow) => (
              <TableRow
                key={leaderboardRow.owner}
                className={cn(
                  leaderboardRow.owner === userPointsData.owner && "bg-chartreuse/30 hover:bg-chartreuse/30"
                )}
              >
                <TableCell className="font-medium text-left font-mono">
                  {leaderboardRow.rank === 1 && <span className="text-xl -ml-1">🥇</span>}
                  {leaderboardRow.rank === 2 && <span className="text-xl -ml-1">🥈</span>}
                  {leaderboardRow.rank === 3 && <span className="text-xl -ml-1">🥉</span>}
                  {leaderboardRow.rank > 3 && <span>{leaderboardRow.rank}</span>}
                </TableCell>
                <TableCell>
                  {leaderboardRow.owner && (
                    <Link
                      href={`https://solscan.io/address/${leaderboardRow.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "font-medium border-b transition-colors border-transparent",
                        leaderboardRow.domain && "text-chartreuse  hover:border-chartreuse",
                        !leaderboardRow.domain && "text-white hover:border-white"
                      )}
                    >
                      {leaderboardRow.domain
                        ? leaderboardRow.domain
                        : shortenAddress(new PublicKey(leaderboardRow.owner))}
                    </Link>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "font-mono text-muted-foreground",
                    leaderboardSettings.orderCol === "total_deposit_points" && "text-white"
                  )}
                >
                  {groupedNumberFormatter.format(leaderboardRow.total_activity_deposit_points)}
                </TableCell>
                <TableCell
                  className={cn(
                    "font-mono text-muted-foreground",
                    leaderboardSettings.orderCol === "total_borrow_points" && "text-white"
                  )}
                >
                  {groupedNumberFormatter.format(leaderboardRow.total_activity_borrow_points)}
                </TableCell>
                <TableCell
                  className={cn(
                    "font-mono text-muted-foreground",
                    leaderboardSettings.orderCol === "total_referral_points" && "text-white"
                  )}
                >
                  {groupedNumberFormatter.format(leaderboardRow.total_referral_points)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-muted-foreground",
                    leaderboardSettings.orderCol === "total_points" && "text-white"
                  )}
                >
                  {groupedNumberFormatter.format(leaderboardRow.total_points)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </Table>
      {(!leaderboardSettings.search || leaderboardData.length === 0) && (
        <div className="flex gap-2 py-2 text-sm items-center text-muted-foreground">
          <p className="ml-2.5 mr-auto">
            {leaderboardCount > 0 && (
              <>
                Showing page {leaderboardSettings.currentPage} of{" "}
                {Math.ceil(leaderboardCount / leaderboardSettings.pageSize)}
              </>
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={leaderboardSettings.currentPage === 1 || pointsTableState !== PointsTableState.Ready}
            onClick={() => {
              if (pointsTableState !== PointsTableState.Ready) return;
              setPointsTableState(PointsTableState.Working);
              setLeaderboardSettings({
                ...leaderboardSettings,
                currentPage: 1,
                pageDirection: "prev",
              });
            }}
          >
            <span className="-translate-y-[1px]">&laquo;</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={leaderboardSettings.currentPage === 1 || pointsTableState !== PointsTableState.Ready}
            onClick={() => {
              if (pointsTableState !== PointsTableState.Ready) return;
              setPointsTableState(PointsTableState.Working);
              setLeaderboardSettings({
                ...leaderboardSettings,
                currentPage: leaderboardSettings.currentPage - 1,
                pageDirection: "prev",
              });
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={
              leaderboardSettings.currentPage === Math.ceil(leaderboardCount / leaderboardSettings.pageSize) ||
              pointsTableState !== PointsTableState.Ready
            }
            onClick={() => {
              if (pointsTableState !== PointsTableState.Ready) return;
              setPointsTableState(PointsTableState.Working);
              setLeaderboardSettings({
                ...leaderboardSettings,
                currentPage: leaderboardSettings.currentPage + 1,
              });
            }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
