import React from "react";

import Image from "next/image";
import Link from "next/link";

import { numeralFormatter, tokenPriceFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { getTokenImageURL } from "~/utils";

import { PositionActionButtons } from "~/components/common/Portfolio";
import { TableCell, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { GroupData } from "~/store/tradeStore";
import { useGroupBanks, useGroupPosition } from "~/hooks/arenaHooks";
interface props {
  group: GroupData;
}

export const PositionListItem = ({ group }: props) => {
  const { borrowBank, depositBank } = useGroupBanks({ group });
  const { positionSizeUsd, positionSizeToken, totalUsdValue, leverage } = useGroupPosition({ group });

  return (
    <TableRow className="even:bg-white/50 hover:even:bg-white/50">
      <TableCell>
        {group.pool.token.isActive && group.pool.token.position.isLending ? (
          <Badge className="w-14 bg-success uppercase font-medium justify-center">long</Badge>
        ) : (
          <Badge className="w-14 bg-error uppercase font-medium justify-center">short</Badge>
        )}
      </TableCell>
      <TableCell>
        <Link
          href={`/trade/${group.client.group.address.toBase58()}`}
          className="flex items-center gap-3 transition-colors hover:text-mrgn-chartreuse"
        >
          <Image
            src={getTokenImageURL(group.pool.token.info.state.mint.toBase58())}
            width={24}
            height={24}
            alt={group.pool.token.meta.tokenSymbol}
            className="rounded-full shrink-0"
          />{" "}
          {group.pool.token.meta.tokenSymbol}
        </Link>
      </TableCell>
      <TableCell>{usdFormatter.format(totalUsdValue)}</TableCell>
      <TableCell>{`${leverage}x`}</TableCell>
      <TableCell>{positionSizeUsd < 0.01 ? "< 0.01" : usdFormatter.format(positionSizeUsd)}</TableCell>
      <TableCell>{tokenPriceFormatter(group.pool.token.info.oraclePrice.priceRealtime.price.toNumber())}</TableCell>

      <TableCell>
        {group.pool.token.isActive && group.pool.token.position.liquidationPrice ? (
          <>{tokenPriceFormatter(group.pool.token.position.liquidationPrice)}</>
        ) : (
          "n/a"
        )}
      </TableCell>
      <TableCell className="text-right">
        {group.client && <PositionActionButtons isBorrowing={!!borrowBank} activeGroup={group} />}
      </TableCell>
    </TableRow>
  );
};
