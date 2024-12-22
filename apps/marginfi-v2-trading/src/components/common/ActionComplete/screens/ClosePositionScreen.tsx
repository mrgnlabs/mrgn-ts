import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { ArenaPoolV2Extended } from "~/types/trade-store.types";
import { PnlLabel, PnlBadge } from "~/components/common/pnl-display";

interface Props {
  tokenBank: ExtendedBankInfo;
  size: number;
  leverage: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  txn: string;
  txnLink?: string;
}

export const ClosePositionScreen = ({ tokenBank, size, leverage, entryPrice, exitPrice, pnl, txn, txnLink }: Props) => {
  return (
    <>
      <div className="flex flex-col items-center gap-4 border-b border-border pb-10">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex items-center">
            <Image
              className="rounded-full z-20"
              src={tokenBank.meta.tokenLogoUri}
              alt={(tokenBank.meta.tokenSymbol || "Token") + "  logo"}
              width={52}
              height={52}
            />
          </div>
          <h3 className="text-2xl font-medium text-center">{tokenBank?.meta.tokenSymbol} position closed</h3>
        </div>
        {pnl ? (
          <div className="flex items-center justify-center gap-2">
            <PnlLabel pnl={pnl} positionSize={size} className="text-3xl" />
            <PnlBadge pnl={pnl} positionSize={size} className="text-sm" />
          </div>
        ) : (
          <></>
        )}
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        <dt>Size</dt>
        <dd className="text-right">${dynamicNumeralFormatter(size)}</dd>
        <dt>Leverage</dt>
        <dd className="text-right">{leverage}x</dd>
        {entryPrice ? (
          <>
            <dt>Entry Price</dt>
            <dd className="text-right">${dynamicNumeralFormatter(entryPrice)}</dd>
          </>
        ) : (
          <></>
        )}
        <dt>Exit Price</dt>
        <dd className="text-right">${dynamicNumeralFormatter(exitPrice)}</dd>
        <dt>Transaction</dt>
        <dd className="text-right">
          <Link
            href={txnLink || `https://solscan.io/tx/${txn}`}
            className="flex items-center justify-end gap-1.5 text-foreground text-sm underline hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {shortenAddress(txn || "")} <IconExternalLink size={15} className="-translate-y-[1px]" />
          </Link>
        </dd>
      </dl>
    </>
  );
};
