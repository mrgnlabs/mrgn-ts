import React from "react";

import Link from "next/link";

import { IconExternalLink } from "@tabler/icons-react";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn, composeExplorerUrl } from "@mrgnlabs/mrgn-utils";

import { useAssetItemData } from "~/hooks/useAssetItemData";

interface Props {
  txn: string;
}

export const StakedCollatScreen = ({}: Props) => {
  return (
    <>
      {/* <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-4xl font-medium">
            {amount} {bank?.meta.tokenSymbol}
          </h3>
          {bank && (
            <img
              className="rounded-full w-9 h-9"
              src={bank.meta.tokenLogoUri}
              alt={(bank?.meta.tokenSymbol || "Token") + "  logo"}
              width={36}
              height={36}
            />
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        {bank?.position && (
          <>
            <dt>Total {bank.meta.tokenSymbol} Deposits</dt>
            <dd className="text-right">
              {bank.position.amount} {bank.meta.tokenSymbol}
            </dd>
          </>
        )}
        <dt>APY</dt>
        <dd className={cn("text-right", actionTextColor)}>{rateAP}</dd>
        <dt>Transaction</dt>
        <dd className="text-right">
          <Link
            href={composeExplorerUrl(txn) ?? ""}
            className="flex items-center justify-end gap-1.5 text-foreground text-sm underline hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {shortenAddress(txn || "")} <IconExternalLink size={15} className="-translate-y-[1px]" />
          </Link>
        </dd>
      </dl> */}
    </> // TODO: update
  );
};
