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
import { usePositionsData } from "~/hooks/usePositionsData";
import { PnlDisplayTooltip } from "../../pnl-display/pnl-display-tooltip";
import { InfoCircledIcon } from "@radix-ui/react-icons";
interface props {
  arenaPool: ArenaPoolV2Extended;
}

export const PositionListItem = ({ arenaPool }: props) => {
  const router = useRouter();
  const positionData = usePositionsData({ groupPk: arenaPool.groupPk });
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
        <PnlDisplayTooltip
          entryPriceUsd={positionData?.entryPrice ?? 0}
          liquidationPriceUsd={arenaPool.tokenBank.isActive ? arenaPool.tokenBank.position.liquidationPrice ?? 0 : 0}
          priceUsd={arenaPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber()}
          pnl={positionData?.pnl ?? 0}
        >
          <div className="flex flex-row items-center gap-1">
            {arenaPool.tokenBank.isActive ? <>${dynamicNumeralFormatter(positionData?.pnl ?? 0)}</> : "n/a"}{" "}
            <InfoCircledIcon />
          </div>
        </PnlDisplayTooltip>
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
