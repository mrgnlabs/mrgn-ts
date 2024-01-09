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
import { IconSearch, IconTrophyFilled } from "~/components/ui/icons";
import { cn } from "~/utils";

type PointsLeaderboardProps = {
  userPointsData: UserPointsData;
};

export const PointsLeaderboard = ({ userPointsData }: PointsLeaderboardProps) => {
  const { connection } = useConnection();
  const [leaderboardData, setLeaderboardData] = React.useState<LeaderboardRow[]>([]);
  const [leaderboardCount, setLeaderboardCount] = React.useState<number>(0);
  const [leaderboardSettings, setLeaderboardSettings] = React.useState<LeaderboardSettings>({
    pageSize: 100,
    currentPage: 1,
    orderCol: "rank",
    orderDir: "asc",
  });
  const [leaderboardSearch, setLeaderboardSearch] = React.useState<string>("");
  const debouncedLeaderboardSearch = useDebounce(leaderboardSearch, 300);

  React.useEffect(() => {
    const getLeaderboardData = async () => {
      const data = await fetchLeaderboardData(connection, leaderboardSettings);
      const count = await fetchTotalLeaderboardCount();
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
            type="search"
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
              currentPage: Math.ceil(userPointsData.rank / leaderboardSettings.pageSize),
            })
          }
        >
          <IconTrophyFilled size={16} /> Jump to your rank
        </Button>
      </div>
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
            <TableRow
              key={leaderboardRow.id}
              className={cn(leaderboardRow.owner === userPointsData.owner && "bg-chartreuse/30 hover:bg-chartreuse/30")}
            >
              <TableCell className="font-medium text-left font-mono">
                {leaderboardRow.rank === 1 && <span className="text-xl -ml-1">🥇</span>}
                {leaderboardRow.rank === 2 && <span className="text-xl -ml-1">🥈</span>}
                {leaderboardRow.rank === 3 && <span className="text-xl -ml-1">🥉</span>}
                {leaderboardRow.rank > 3 && <span>{leaderboardRow.rank}</span>}
              </TableCell>
              <TableCell>
                <Link
                  href={`https://solscan.io/address/${leaderboardRow.owner}`}
                  className="text-chartreuse font-medium border-b border-transparent transition-colors hover:border-chartreuse"
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
      <div className="flex gap-2 py-2 text-sm items-center text-muted-foreground">
        <p className="ml-2.5 mr-auto">
          Showing page {leaderboardSettings.currentPage} of {Math.ceil(leaderboardCount / leaderboardSettings.pageSize)}
        </p>
        {leaderboardSettings.currentPage > 1 && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setLeaderboardSettings({
                ...leaderboardSettings,
                currentPage: 1,
              });
            }}
          >
            <span className="-translate-y-[1px]">&laquo;</span>
          </Button>
        )}
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
