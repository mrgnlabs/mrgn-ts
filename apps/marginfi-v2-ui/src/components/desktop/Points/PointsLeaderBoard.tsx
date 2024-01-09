import React from "react";

import Link from "next/link";

import { PublicKey } from "@solana/web3.js";
import {
  fetchLeaderboardData,
  fetchTotalLeaderboardCount,
  LeaderboardRow,
  LeaderboardSettings,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { groupedNumberFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";

import { useConnection } from "~/hooks/useConnection";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";

export const PointsLeaderboard = () => {
  const { connection } = useConnection();
  const [leaderboardData, setLeaderboardData] = React.useState<LeaderboardRow[]>([]);
  const [leaderboardCount, setLeaderboardCount] = React.useState<number>(0);
  const [leaderboardSettings, setLeaderboardSettings] = React.useState<LeaderboardSettings>({
    pageSize: 100,
    currentPage: 1,
    orderCol: "rank",
    orderDir: "asc",
  });

  React.useEffect(() => {
    const getLeaderboardData = async () => {
      const data = await fetchLeaderboardData(connection, leaderboardSettings);
      const count = await fetchTotalLeaderboardCount();
      setLeaderboardData([...data]);
      setLeaderboardCount(count);
    };

    getLeaderboardData();
  }, [leaderboardSettings]);

  return (
    <div className="w-full">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px] text-left">Rank</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Deposit Points</TableHead>
            <TableHead>Borrow Points</TableHead>
            <TableHead>Referral Points</TableHead>
            <TableHead className="text-right">Total Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboardData.map((leaderboardRow) => (
            <TableRow key={leaderboardRow.id}>
              <TableCell className="font-medium text-left font-mono">
                {leaderboardRow.rank === 1 && <span className="text-xl">🥇</span>}
                {leaderboardRow.rank === 2 && <span className="text-xl">🥈</span>}
                {leaderboardRow.rank === 3 && <span className="text-xl">🥉</span>}
                {leaderboardRow.rank > 3 && <span className="ml-1">{leaderboardRow.rank}</span>}
              </TableCell>
              <TableCell>
                <Link
                  href={`https://solscan.io/address/${leaderboardRow.owner}`}
                  className="text-chartreuse font-medium"
                >
                  {leaderboardRow.domain ? leaderboardRow.domain : shortenAddress(new PublicKey(leaderboardRow.owner))}
                </Link>
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
      <div className="flex gap-2 py-2 text-sm items-center mb-8 text-muted-foreground">
        <p className="ml-2.5">
          Showing page {leaderboardSettings.currentPage} of {Math.ceil(leaderboardCount / leaderboardSettings.pageSize)}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={leaderboardSettings.currentPage === 1}
          className="ml-auto"
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
