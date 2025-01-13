import React from "react";

import { useRouter } from "next/router";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { ArenaPoolV2Extended, GroupStatus } from "~/types/trade-store.types";
import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { usePositionsData } from "~/hooks/usePositionsData";

import { PositionActionButtons } from "~/components/common/Portfolio";
import { PnlDisplayTooltip, PnlLabel } from "~/components/common/pnl-display/";
import { TableCell, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";

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
          (e.target instanceof Element &&
            (e.target.hasAttribute("data-state") ||
              e.target.closest("[data-command-item]") ||
              e.target.closest("[data-router-ignore]")))
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
        <div className="flex items-center gap-2 justify-start">
          <div className="relative w-max flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={arenaPool.tokenBank.meta.tokenLogoUri}
              alt={arenaPool.tokenBank.meta.tokenSymbol}
              width={24}
              height={24}
              className="bg-background border rounded-full h-[24px] w-[24px] object-cover"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={arenaPool.quoteBank.meta.tokenLogoUri}
              alt={arenaPool.quoteBank.meta.tokenSymbol}
              width={12}
              height={12}
              className="absolute -bottom-0.5 -right-0.5 bg-background border rounded-full h-[12px] w-[12px] object-cover"
            />
          </div>
          {arenaPool.tokenBank.meta.tokenSymbol}/{arenaPool.quoteBank.meta.tokenSymbol}
        </div>
      </TableCell>

      <TableCell>
        $
        {dynamicNumeralFormatter(totalUsdValue, {
          ignoreMinDisplay: true,
        })}
      </TableCell>
      <TableCell>{`${leverage}x`}</TableCell>
      <TableCell>
        $
        {dynamicNumeralFormatter(positionSizeUsd, {
          ignoreMinDisplay: true,
        })}
      </TableCell>
      <TableCell>
        <PnlDisplayTooltip pool={arenaPool}>
          <div className="flex flex-row items-center gap-1">
            <PnlLabel pnl={positionData?.pnl} positionSize={positionSizeUsd} />
            <InfoCircledIcon />
          </div>
        </PnlDisplayTooltip>
      </TableCell>

      <TableCell className="text-right">
        {client && accountSummary && arenaPool && (
          <PositionActionButtons
            arenaPool={arenaPool}
            isBorrowing={arenaPool.status === GroupStatus.SHORT || arenaPool.status === GroupStatus.LONG}
            accountSummary={accountSummary}
            client={client}
            selectedAccount={wrappedAccount}
          />
        )}
      </TableCell>
    </TableRow>
  );
};
