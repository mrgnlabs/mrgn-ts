import React from "react";
import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";

import { numeralFormatter, tokenPriceFormatter, percentFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { useExtendedPool } from "~/hooks/useExtendedPools";
import { ArenaPoolV2 } from "~/types/trade-store.types";

type AdminPoolCardProps = {
  pool: ArenaPoolV2;
  last?: boolean;
};

export const AdminPoolCard = ({ pool, last }: AdminPoolCardProps) => {
  const extendedPool = useExtendedPool(pool);
  return (
    <div className={cn("grid grid-cols-7 py-2 w-full items-center", !last && "border-b pb-3 mb-2")}>
      <div className="flex items-center gap-2">
        <img
          src={extendedPool.tokenBank.meta.tokenLogoUri}
          alt={extendedPool.tokenBank.meta.tokenSymbol}
          width={32}
          height={32}
          className="rounded-full bg-background"
        />
        <h2>{extendedPool.tokenBank.meta.tokenSymbol}</h2>
      </div>
      {extendedPool.tokenBank.tokenData && (
        <>
          <div>
            {tokenPriceFormatter(extendedPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())}{" "}
            <span
              className={cn(
                "text-xs ml-2",
                extendedPool.tokenBank.tokenData.priceChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
              )}
            >
              {extendedPool.tokenBank.tokenData.priceChange24hr > 0 && "+"}
              {percentFormatter.format(extendedPool.tokenBank.tokenData.priceChange24hr / 100)}
            </span>
          </div>
          <div>
            ${numeralFormatter(extendedPool.tokenBank.tokenData.volume24hr)}
            {extendedPool.tokenBank.tokenData.volumeChange24hr && (
              <span
                className={cn(
                  "text-xs ml-2",
                  extendedPool.tokenBank.tokenData.volumeChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                )}
              >
                {extendedPool.tokenBank.tokenData.volumeChange24hr > 0 && "+"}
                {percentFormatter.format(extendedPool.tokenBank.tokenData.volumeChange24hr / 100)}
              </span>
            )}
          </div>
          {/* <div>${numeralFormatter(extendedPool.tokenBank.tokenData.marketCap)}</div> */}
          {/* <div>{extendedPool.poolData && `$${numeralFormatter(extendedPool.quoteBa)}`}</div> */}
        </>
      )}
      <div className="pl-5">
        <Link
          href={`https://solscan.io/account/${pool.groupPk.toBase58()}`}
          className="flex items-center gap-1.5"
          target="_blank"
          rel="noopener noreferrer"
        >
          {shortenAddress(pool.groupPk.toBase58() || "")} <IconExternalLink size={15} className="-translate-y-[1px]" />
        </Link>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Link href={`/admin/${pool.groupPk.toBase58()}`} className="w-full">
          <Button variant="default" className="w-full">
            Details
          </Button>
        </Link>
      </div>
    </div>
  );
};
