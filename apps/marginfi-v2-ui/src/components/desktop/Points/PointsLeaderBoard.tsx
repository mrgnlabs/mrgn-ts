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
import { IconSearch, IconTrophyFilled, IconSortAscending, IconSortDescending } from "~/components/ui/icons";
import { cn } from "~/utils";

type PointsLeaderboardProps = {
  userPointsData: UserPointsData;
};

enum LeaderboardOrderCol {
  Rank = "rank",
  Address = "owner",
  DepositPoints = "total_deposit_points",
  BorrowPoints = "total_borrow_points",
  ReferralPoints = "total_referral_points",
  TotalPoints = "total_points",
}

export const PointsLeaderboard = ({ userPointsData }: PointsLeaderboardProps) => {
  const { connection } = useConnection();
  const [leaderboardData, setLeaderboardData] = React.useState<LeaderboardRow[]>([]);
  const [leaderboardCount, setLeaderboardCount] = React.useState<number>(0);
  const [leaderboardSettings, setLeaderboardSettings] = React.useState<LeaderboardSettings>({
    pageSize: 100,
    currentPage: 1,
    orderCol: LeaderboardOrderCol.Rank,
  });
  const [leaderboardSearch, setLeaderboardSearch] = React.useState<string>("");
  const debouncedLeaderboardSearch = useDebounce(leaderboardSearch, 300);

  React.useEffect(() => {
    const getLeaderboardData = async () => {
      const data = await fetchLeaderboardData(connection, leaderboardSettings);
      const count = await fetchTotalLeaderboardCount();
      console.log(data);
      setLeaderboardData([...data]);
      setLeaderboardCount(count);
    };

    getLeaderboardData();
  }, [leaderboardSettings]);

  React.useEffect(() => {
    const getLeaderboardData = async () => {
      let pk = leaderboardSearch;

      if (leaderboardSearch.includes(".sol")) {
        const { pubkey } = getDomainKeySync(leaderboardSearch);
        const { registry } = await NameRegistryState.retrieve(connection, pubkey);

        pk = registry.owner.toBase58();
      }

      const data = await fetchLeaderboardData(connection, leaderboardSettings, pk);
      const count = await fetchTotalLeaderboardCount();
      setLeaderboardData([...data]);
      setLeaderboardCount(count);
    };

    getLeaderboardData();
  }, [debouncedLeaderboardSearch]);

  return (
    <div className="w-full mt-10 space-y-3 pb-16">
      <div className="flex items-center gap-2 justify-between">
        <div className="relative w-full">
          <IconSearch className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" size={15} />
          <Input
            type="text"
            placeholder="Search by wallet address or .sol domain..."
            className="w-full max-w-xl rounded-full pl-9"
            onChange={(e) => setLeaderboardSearch(e.currentTarget.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() =>
            setLeaderboardSettings({
              ...leaderboardSettings,
              orderCol: LeaderboardOrderCol.Rank,
              currentPage: userPointsData.userRank
                ? Math.ceil(userPointsData.userRank / leaderboardSettings.pageSize)
                : 0,
            })
          }
        >
          <IconTrophyFilled size={16} /> Jump to your rank
        </Button>
      </div>
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead
              className={cn(
                "w-[100px] text-left",
                leaderboardSettings.orderCol === LeaderboardOrderCol.Rank && "text-white"
              )}
            >
              <button
                className="flex items-center gap-0.5 cursor-pointer"
                onClick={() => {
                  if (leaderboardSettings.orderCol === LeaderboardOrderCol.Rank) return;
                  setLeaderboardSettings({
                    ...leaderboardSettings,
                    orderCol: LeaderboardOrderCol.Rank,
                    currentPage: 1,
                  });
                }}
              >
                {leaderboardSettings.orderCol === LeaderboardOrderCol.Rank && (
                  <IconSortDescending className="mr-1" size={15} />
                )}
                Rank
              </button>
            </TableHead>
            <TableHead>Address</TableHead>
            <TableHead
              className={cn(leaderboardSettings.orderCol === LeaderboardOrderCol.DepositPoints && "text-white")}
            >
              <button
                className="flex items-center gap-0.5 cursor-pointer"
                onClick={() => {
                  if (leaderboardSettings.orderCol === LeaderboardOrderCol.DepositPoints) return;
                  setLeaderboardSettings({
                    ...leaderboardSettings,
                    orderCol: LeaderboardOrderCol.DepositPoints,
                    currentPage: 1,
                  });
                }}
              >
                {leaderboardSettings.orderCol === LeaderboardOrderCol.DepositPoints && (
                  <IconSortDescending className="mr-1" size={15} />
                )}
                Deposit Points
              </button>
            </TableHead>
            <TableHead
              className={cn(leaderboardSettings.orderCol === LeaderboardOrderCol.BorrowPoints && "text-white")}
            >
              <button
                className="flex items-center gap-0.5 cursor-pointer"
                onClick={() => {
                  if (leaderboardSettings.orderCol === LeaderboardOrderCol.BorrowPoints) return;
                  setLeaderboardSettings({
                    ...leaderboardSettings,
                    orderCol: LeaderboardOrderCol.BorrowPoints,
                    currentPage: 1,
                  });
                }}
              >
                {leaderboardSettings.orderCol === LeaderboardOrderCol.BorrowPoints && (
                  <IconSortDescending className="mr-1" size={15} />
                )}
                Borrow Points
              </button>
            </TableHead>
            <TableHead
              className={cn(leaderboardSettings.orderCol === LeaderboardOrderCol.ReferralPoints && "text-white")}
            >
              <button
                className="flex items-center gap-0.5 cursor-pointer"
                onClick={() => {
                  if (leaderboardSettings.orderCol === LeaderboardOrderCol.ReferralPoints) return;
                  setLeaderboardSettings({
                    ...leaderboardSettings,
                    orderCol: LeaderboardOrderCol.ReferralPoints,
                    currentPage: 1,
                  });
                }}
              >
                {leaderboardSettings.orderCol === LeaderboardOrderCol.ReferralPoints && (
                  <IconSortDescending className="mr-1" size={15} />
                )}
                Referral Points
              </button>
            </TableHead>
            <TableHead
              className={cn(
                "text-right",
                leaderboardSettings.orderCol === LeaderboardOrderCol.TotalPoints && "text-white"
              )}
            >
              <button
                className="flex items-center gap-0.5 cursor-pointer text-right ml-auto"
                onClick={() => {
                  if (leaderboardSettings.orderCol === LeaderboardOrderCol.TotalPoints) return;
                  setLeaderboardSettings({
                    ...leaderboardSettings,
                    orderCol: LeaderboardOrderCol.TotalPoints,
                    currentPage: 1,
                  });
                }}
              >
                {leaderboardSettings.orderCol === LeaderboardOrderCol.TotalPoints && (
                  <IconSortDescending className="mr-1" size={15} />
                )}
                Total Points
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboardData.map((leaderboardRow) => (
            <TableRow
              key={leaderboardRow.owner}
              className={cn(leaderboardRow.owner === userPointsData.owner && "bg-chartreuse/30 hover:bg-chartreuse/30")}
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
              <TableCell className="font-mono">
                {groupedNumberFormatter.format(leaderboardRow.total_deposit_points)}
              </TableCell>
              <TableCell className="font-mono">
                {groupedNumberFormatter.format(leaderboardRow.total_borrow_points)}
              </TableCell>
              <TableCell className="font-mono">
                {groupedNumberFormatter.format(leaderboardRow.total_referral_points)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {groupedNumberFormatter.format(leaderboardRow.total_points)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex gap-2 py-2 text-sm items-center text-muted-foreground">
        <p className="ml-2.5 mr-auto">
          Showing page {leaderboardSettings.currentPage} of {Math.ceil(leaderboardCount / leaderboardSettings.pageSize)}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={leaderboardSettings.currentPage === 1}
          onClick={() => {
            setLeaderboardSettings({
              ...leaderboardSettings,
              currentPage: 1,
            });
          }}
        >
          <span className="-translate-y-[1px]">&laquo;</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={leaderboardSettings.currentPage === 1}
          onClick={() => {
            setLeaderboardSettings({
              ...leaderboardSettings,
              currentPage: leaderboardSettings.currentPage - 1,
            });
          }}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={leaderboardSettings.currentPage === Math.ceil(leaderboardCount / leaderboardSettings.pageSize)}
          onClick={() => {
            setLeaderboardSettings({
              ...leaderboardSettings,
              currentPage: leaderboardSettings.currentPage + 1,
            });
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
