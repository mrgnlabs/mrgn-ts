import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { ArenaPoolV2Extended } from "~/types/trade-store.types";

import { SharePosition } from "~/components/common/share-position/share-position";

interface Props {
  pool: ArenaPoolV2Extended;
  txn: string;
}

export const ClosePositionScreen = ({ pool, txn }: Props) => {
  return (
    <>
      <div className="flex flex-col items-center gap-4 border-b border-border pb-10">
        {pool.tokenBank && (
          <Image
            className="rounded-full w-9 h-9"
            src={pool.tokenBank.meta.tokenLogoUri}
            alt={(pool.tokenBank.meta.tokenSymbol || "Token") + "  logo"}
            width={36}
            height={36}
          />
        )}
        <h3 className="text-2xl font-medium text-center">
          {`You closed your ${pool.tokenBank?.meta.tokenSymbol}  position`}
        </h3>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        {pool.tokenBank?.isActive && pool.tokenBank?.position && (
          <>
            <dt>
              Total {pool.tokenBank.meta.tokenSymbol} {pool.tokenBank.position.isLending ? "Deposits" : "Borrows"}
            </dt>
            <dd className="text-right">
              {pool.tokenBank.position.amount} {pool.tokenBank.meta.tokenSymbol}
            </dd>
          </>
        )}
        {pool.quoteBank?.isActive && pool.quoteBank?.position && (
          <>
            <dt>
              Total {pool.quoteBank.meta.tokenSymbol} {pool.quoteBank.position.isLending ? "Deposits" : "Borrows"}
            </dt>
            <dd className="text-right">
              {pool.quoteBank.position.amount} {pool.quoteBank.meta.tokenSymbol}
            </dd>
          </>
        )}

        <dt>Transaction</dt>
        <dd className="text-right">
          <Link
            href={`https://solscan.io/tx/${txn}`}
            className="flex items-center justify-end gap-1.5 text-foreground text-sm underline hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {shortenAddress(txn || "")} <IconExternalLink size={15} className="-translate-y-[1px]" />
          </Link>
        </dd>
      </dl>

      <SharePosition pool={pool} />
    </>
  );
};
