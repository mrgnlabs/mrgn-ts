import React from "react";
import Link from "next/link";
import Image from "next/image";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { dynamicNumeralFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";
import { IconExternalLink } from "@tabler/icons-react";

interface Props {
  tokenBank: ExtendedBankInfo;
  collateralBank: ExtendedBankInfo;
  size: number;
  leverage: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  txn: string;
  txnLink?: string;
}

export const ClosePositionScreen = ({
  tokenBank,
  collateralBank,
  size,
  leverage,
  entryPrice,
  exitPrice,
  pnl,
  txn,
  txnLink,
}: Props) => {
  return (
    <>
      <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center">
            <Image
              className="rounded-full w-9 h-9 z-20"
              src={tokenBank.meta.tokenLogoUri}
              alt={(tokenBank.meta.tokenSymbol || "Token") + "  logo"}
              width={36}
              height={36}
            />
            <Image
              className="rounded-full w-9 h-9 z-10 -translate-x-3"
              src={collateralBank.meta.tokenLogoUri}
              alt={(collateralBank.meta.tokenSymbol || "Token") + "  logo"}
              width={36}
              height={36}
            />
          </div>
          <h3 className="text-4xl font-medium text-center">{`${tokenBank?.meta.tokenSymbol}/${collateralBank?.meta.tokenSymbol}`}</h3>
        </div>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        <dt>Size</dt>
        <dd className="text-right">${dynamicNumeralFormatter(size)}</dd>
        <dt>Leverage</dt>
        <dd className="text-right">{leverage}x</dd>
        <dt>Entry Price</dt>
        <dd className="text-right">${dynamicNumeralFormatter(entryPrice)}</dd>
        <dt>Exit Price</dt>
        <dd className="text-right">${dynamicNumeralFormatter(exitPrice)}</dd>
        <dt>PnL</dt>
        <dd className={cn("text-right", pnl > 0 && "text-mrgn-success", pnl < 0 && "text-mrgn-error")}>
          {pnl > 0 && "+"}${dynamicNumeralFormatter(pnl)}
        </dd>
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
