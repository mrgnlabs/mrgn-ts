import React from "react";

import Image from "next/image";
import { useRouter } from "next/router";

import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { PositionActionButtons } from "~/components/common/Portfolio";
import { TableCell, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { ArenaPoolV2Extended, GroupStatus } from "~/types/trade-store.types";
import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
interface props {
  arenaPool: ArenaPoolV2Extended;
}

export const PositionListItem = ({ arenaPool }: props) => {
  const router = useRouter();
  const client = useMarginfiClient({ groupPk: arenaPool.groupPk });
  const { accountSummary, wrappedAccount } = useWrappedAccount({
    client,
    groupPk: arenaPool.groupPk,
    banks: [arenaPool.tokenBank, arenaPool.quoteBank],
  });
  const { positionSizeUsd, totalUsdValue, leverage } = useLeveragedPositionDetails({
    pool: arenaPool,
  });

  return (
    <TableRow
      className="cursor-pointer transition-colors hover:bg-accent/75"
      onClick={(e) => {
        if (
          e.target instanceof HTMLButtonElement ||
          e.target instanceof HTMLAnchorElement ||
          e.target instanceof SVGElement ||
          (e.target instanceof Element && e.target.hasAttribute("data-state"))
        )
          return;
        router.push(`/trade/${arenaPool.groupPk.toBase58()}`);
      }}
    >
      <TableCell>
        {arenaPool.status === GroupStatus.LONG ? (
          <Badge className="w-14 bg-success uppercase font-medium justify-center">long</Badge>
        ) : (
          <Badge className="w-14 bg-error uppercase font-medium justify-center">short</Badge>
        )}
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-3">
          <Image
            src={arenaPool.tokenBank.meta.tokenLogoUri}
            width={24}
            height={24}
            alt={arenaPool.tokenBank.meta.tokenSymbol}
            className="rounded-full shrink-0"
          />{" "}
          {arenaPool.tokenBank.meta.tokenSymbol}
        </span>
      </TableCell>
      <TableCell>${dynamicNumeralFormatter(totalUsdValue)}</TableCell>
      <TableCell>{`${leverage}x`}</TableCell>
      <TableCell>${dynamicNumeralFormatter(positionSizeUsd)}</TableCell>
      <TableCell>
        ${dynamicNumeralFormatter(arenaPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())}
      </TableCell>

      <TableCell>
        {arenaPool.tokenBank.isActive && arenaPool.tokenBank.position.liquidationPrice ? (
          <>${dynamicNumeralFormatter(arenaPool.tokenBank.position.liquidationPrice)}</>
        ) : (
          "n/a"
        )}
      </TableCell>
      <TableCell className="text-right">
        {client && accountSummary && (
          <PositionActionButtons
            arenaPool={arenaPool}
            isBorrowing={arenaPool.status === GroupStatus.SHORT || arenaPool.status === GroupStatus.LONG}
            rightAlignFinalButton={true}
            accountSummary={accountSummary}
            client={client}
            selectedAccount={wrappedAccount}
          />
        )}
      </TableCell>
    </TableRow>
  );
};
