import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, tokenPriceFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore } from "~/store";

import { PositionActionButtons } from "~/components/common/Portfolio";
import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { GroupData } from "~/store/tradeStore";
import { PublicKey } from "@solana/web3.js";
import { PositionListItem } from "./PositionListItem";

export const PositionList = ({ activeGroupPk }: { activeGroupPk: PublicKey }) => {
  const [portfolio] = useTradeStore((state) => [state.portfolio]);

  const portfolioCombined = React.useMemo(() => {
    if (!portfolio) return [];
    const isActiveGroupPosition = (item: GroupData) => item.groupPk.equals(activeGroupPk);

    const activeGroupPosition = [...portfolio.long, ...portfolio.short].find(isActiveGroupPosition);

    const sortedLongs = portfolio.long.filter((item) => !isActiveGroupPosition(item));
    const sortedShorts = portfolio.short.filter((item) => !isActiveGroupPosition(item));

    return [...(activeGroupPosition ? [activeGroupPosition] : []), ...sortedLongs, ...sortedShorts];
  }, [activeGroupPk, portfolio]);

  if (!portfolio) return null;

  return (
    <div className="rounded-xl">
      <Table className="min-w-[1080px] overflow-auto">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[14%]">Position</TableHead>
            <TableHead className="w-[14%]">Token</TableHead>
            <TableHead className="w-[14%]">Value</TableHead>
            <TableHead className="w-[14%]">Leverage</TableHead>
            <TableHead className="w-[14%]">Size</TableHead>
            <TableHead className="w-[14%]">Price</TableHead>
            <TableHead className="w-[14%]">Liquidation price</TableHead>
            <TableHead className="w-[14%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {portfolio.long.length === 0 && portfolio.short.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <p className="text-sm text-muted-foreground pt-2">No positions found</p>
              </TableCell>
            </TableRow>
          ) : (
            <></>
          )}

          {portfolioCombined.map((group, index) => {
            return <PositionListItem key={index} group={group} />;
          })}
        </TableBody>
      </Table>
    </div>
  );
};
