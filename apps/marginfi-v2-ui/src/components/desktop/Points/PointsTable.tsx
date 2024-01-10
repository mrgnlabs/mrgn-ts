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

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { IconSearch, IconTrophyFilled, IconSortAscending, IconSortDescending, IconLoader } from "~/components/ui/icons";
import { cn } from "~/utils";

type PointsTableProps = {
  userPointsData: UserPointsData;
};

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

export const PointsTable = ({ userPointsData }: PointsTableProps) => {
  const { connection } = useConnection();
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
  const [isWorking, setIsWorking] = React.useState<boolean>(false);
  const debouncedLeaderboardSettings = useDebounce(leaderboardSettings, 500);

  React.useEffect(() => {
    const getLeaderboardData = async () => {
      setIsWorking(true);

      let pk = debouncedLeaderboardSettings.search;
      const newLeaderboardSettings = { ...debouncedLeaderboardSettings };

      if (debouncedLeaderboardSettings.search && debouncedLeaderboardSettings.search.includes(".sol")) {
        const { pubkey } = getDomainKeySync(debouncedLeaderboardSettings.search);
        const { registry } = await NameRegistryState.retrieve(connection, pubkey);

        console.log(debouncedLeaderboardSettings.search, registry.owner.toBase58());

        pk = registry.owner.toBase58();
        newLeaderboardSettings.search = pk;
      }

      const data = await fetchLeaderboardData(connection, newLeaderboardSettings);
      if (data && data.length > 0) {
        setLeaderboardData([...data]);
      }
      setIsWorking(false);
    };

    getLeaderboardData();
  }, [debouncedLeaderboardSettings]);

  React.useEffect(() => {
    if (leaderboardCount > 0) return;
    const getLeaderboardCount = async () => {
      const count = await fetchTotalLeaderboardCount();
      setLeaderboardCount(count);
    };

    getLeaderboardCount();
  }, []);

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
              className="text-xs absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground border-b border-muted-foreground transition-colors hover:border-transparent"
            >
              clear search
            </button>
          )}
        </div>
      </div>
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px] text-left">
              <button
                className={cn("flex items-center gap-0.5", !leaderboardSettings.search && "cursor-pointer")}
                disabled={(leaderboardSettings.search && leaderboardSettings.search.length > 0) || false}
                onClick={() => {
                  if (isWorking) return;
                  setIsWorking(true);
                  let orderDir = leaderboardSettings.orderDir;

                  if (leaderboardSettings.orderCol !== TableOrderCol.TotalPoints) {
                    orderDir = TableOrderDirection.Desc;
                  } else {
                    orderDir =
                      leaderboardSettings.orderDir === TableOrderDirection.Asc
                        ? TableOrderDirection.Desc
                        : TableOrderDirection.Asc;
                  }

                  setLeaderboardSettings({
                    ...leaderboardSettings,
                    orderCol: TableOrderCol.TotalPoints,
                    orderDir,
                    currentPage: 1,
                  });
                }}
              >
                Rank
              </button>
            </TableHead>
            <TableHead>Address</TableHead>
            <TableHead
              className={cn(
                leaderboardSettings.orderCol === TableOrderCol.DepositPoints &&
                  !leaderboardSettings.search &&
                  "text-white"
              )}
            >
              <button
                className={cn("flex items-center gap-0.5", !leaderboardSettings.search && "cursor-pointer")}
                disabled={(leaderboardSettings.search && leaderboardSettings.search.length > 0) || false}
                onClick={() => {
                  if (isWorking) return;
                  setIsWorking(true);
                  let orderDir = leaderboardSettings.orderDir;

                  if (leaderboardSettings.orderCol !== TableOrderCol.DepositPoints) {
                    orderDir = TableOrderDirection.Desc;
                  } else {
                    orderDir =
                      leaderboardSettings.orderDir === TableOrderDirection.Asc
                        ? TableOrderDirection.Desc
                        : TableOrderDirection.Asc;
                  }
                  setLeaderboardSettings({
                    ...leaderboardSettings,
                    orderCol: TableOrderCol.DepositPoints,
                    orderDir,
                    currentPage: 1,
                  });
                }}
              >
                {leaderboardSettings.orderCol === TableOrderCol.DepositPoints &&
                  leaderboardSettings.orderDir === TableOrderDirection.Desc && (
                    <IconSortDescending className="mr-1" size={15} />
                  )}
                {leaderboardSettings.orderCol === TableOrderCol.DepositPoints &&
                  leaderboardSettings.orderDir === TableOrderDirection.Asc && (
                    <IconSortAscending className="mr-1" size={15} />
                  )}
                Deposit Points
              </button>
            </TableHead>
            <TableHead
              className={cn(
                leaderboardSettings.orderCol === TableOrderCol.BorrowPoints &&
                  !leaderboardSettings.search &&
                  "text-white"
              )}
            >
              <button
                className={cn("flex items-center gap-0.5", !leaderboardSettings.search && "cursor-pointer")}
                disabled={(leaderboardSettings.search && leaderboardSettings.search.length > 0) || false}
                onClick={() => {
                  if (isWorking) return;
                  setIsWorking(true);
                  let orderDir = leaderboardSettings.orderDir;

                  if (leaderboardSettings.orderCol !== TableOrderCol.BorrowPoints) {
                    orderDir = TableOrderDirection.Desc;
                  } else {
                    orderDir =
                      leaderboardSettings.orderDir === TableOrderDirection.Asc
                        ? TableOrderDirection.Desc
                        : TableOrderDirection.Asc;
                  }
                  setLeaderboardSettings({
                    ...leaderboardSettings,
                    orderCol: TableOrderCol.BorrowPoints,
                    orderDir,
                    currentPage: 1,
                    search: "",
                  });
                }}
              >
                {leaderboardSettings.orderCol === TableOrderCol.BorrowPoints &&
                  leaderboardSettings.orderDir === TableOrderDirection.Desc && (
                    <IconSortDescending className="mr-1" size={15} />
                  )}
                {leaderboardSettings.orderCol === TableOrderCol.BorrowPoints &&
                  leaderboardSettings.orderDir === TableOrderDirection.Asc && (
                    <IconSortAscending className="mr-1" size={15} />
                  )}
                Borrow Points
              </button>
            </TableHead>
            <TableHead
              className={cn(
                leaderboardSettings.orderCol === TableOrderCol.ReferralPoints &&
                  !leaderboardSettings.search &&
                  "text-white"
              )}
            >
              <button
                className={cn("flex items-center gap-0.5", !leaderboardSettings.search && "cursor-pointer")}
                disabled={(leaderboardSettings.search && leaderboardSettings.search.length > 0) || false}
                onClick={() => {
                  if (isWorking) return;
                  setIsWorking(true);
                  let orderDir = leaderboardSettings.orderDir;

                  if (leaderboardSettings.orderCol !== TableOrderCol.ReferralPoints) {
                    orderDir = TableOrderDirection.Desc;
                  } else {
                    orderDir =
                      leaderboardSettings.orderDir === TableOrderDirection.Asc
                        ? TableOrderDirection.Desc
                        : TableOrderDirection.Asc;
                  }
                  setLeaderboardSettings({
                    ...leaderboardSettings,
                    orderCol: TableOrderCol.ReferralPoints,
                    orderDir,
                    currentPage: 1,
                  });
                }}
              >
                {leaderboardSettings.orderCol === TableOrderCol.ReferralPoints &&
                  leaderboardSettings.orderDir === TableOrderDirection.Desc && (
                    <IconSortDescending className="mr-1" size={15} />
                  )}
                {leaderboardSettings.orderCol === TableOrderCol.ReferralPoints &&
                  leaderboardSettings.orderDir === TableOrderDirection.Asc && (
                    <IconSortAscending className="mr-1" size={15} />
                  )}
                Referral Points
              </button>
            </TableHead>
            <TableHead
              className={cn(
                "text-right",
                leaderboardSettings.orderCol === TableOrderCol.TotalPoints &&
                  !leaderboardSettings.search &&
                  "text-white"
              )}
            >
              <button
                className={cn(
                  "flex items-center gap-0.5 text-right ml-auto",
                  !leaderboardSettings.search && "cursor-pointer"
                )}
                disabled={(leaderboardSettings.search && leaderboardSettings.search.length > 0) || false}
                onClick={() => {
                  if (isWorking) return;
                  setIsWorking(true);
                  let orderDir = leaderboardSettings.orderDir;

                  if (leaderboardSettings.orderCol !== TableOrderCol.TotalPoints) {
                    orderDir = TableOrderDirection.Desc;
                  } else {
                    orderDir =
                      leaderboardSettings.orderDir === TableOrderDirection.Asc
                        ? TableOrderDirection.Desc
                        : TableOrderDirection.Asc;
                  }
                  setLeaderboardSettings({
                    ...leaderboardSettings,
                    orderCol: TableOrderCol.TotalPoints,
                    orderDir,
                    currentPage: 1,
                  });
                }}
              >
                {leaderboardSettings.orderCol === TableOrderCol.TotalPoints &&
                  leaderboardSettings.orderDir === TableOrderDirection.Desc && (
                    <IconSortDescending className="mr-1" size={15} />
                  )}
                {leaderboardSettings.orderCol === TableOrderCol.TotalPoints &&
                  leaderboardSettings.orderDir === TableOrderDirection.Asc && (
                    <IconSortAscending className="mr-1" size={15} />
                  )}
                Total Points
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        {leaderboardData.length === 0 && (
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
        {leaderboardData.length > 0 && (
          <TableBody>
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
                  {groupedNumberFormatter.format(leaderboardRow.total_deposit_points)}
                </TableCell>
                <TableCell
                  className={cn(
                    "font-mono text-muted-foreground",
                    leaderboardSettings.orderCol === "total_borrow_points" && "text-white"
                  )}
                >
                  {groupedNumberFormatter.format(leaderboardRow.total_borrow_points)}
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
            disabled={leaderboardSettings.currentPage === 1 || isWorking}
            onClick={() => {
              if (isWorking) return;
              setIsWorking(true);
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
            disabled={leaderboardSettings.currentPage === 1 || isWorking}
            onClick={() => {
              if (isWorking) return;
              setIsWorking(true);
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
              isWorking
            }
            onClick={() => {
              if (isWorking) return;
              setIsWorking(true);
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
