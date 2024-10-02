import React from "react";
import Link from "next/link";
import Image from "next/image";
import { IconExternalLink } from "@tabler/icons-react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { getTokenImageURL } from "@mrgnlabs/mrgn-utils";

interface Props {
  tokenBank: ExtendedBankInfo;
  collateralBank: ExtendedBankInfo;
  txn: string;
}

export const ClosePositionScreen = ({ tokenBank, collateralBank, txn }: Props) => {
  return (
    <>
      <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
        <div className="flex items-center justify-center gap-2">
          {tokenBank && (
            <Image
              className="rounded-full w-9 h-9"
              src={getTokenImageURL(tokenBank.info.state.mint.toString())}
              alt={(tokenBank.meta.tokenSymbol || "Token") + "  logo"}
              width={36}
              height={36}
            />
          )}
          <h3 className="text-4xl font-medium">{`${tokenBank?.meta.tokenSymbol}/${collateralBank?.meta.tokenSymbol}`}</h3>
        </div>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        {tokenBank?.isActive && tokenBank?.position && (
          <>
            <dt>
              Total {tokenBank.meta.tokenSymbol} {tokenBank.position.isLending ? "Deposits" : "Borrows"}
            </dt>
            <dd className="text-right">
              {tokenBank.position.amount} {tokenBank.meta.tokenSymbol}
            </dd>
          </>
        )}
        {collateralBank?.isActive && collateralBank?.position && (
          <>
            <dt>
              Total {collateralBank.meta.tokenSymbol} {collateralBank.position.isLending ? "Deposits" : "Borrows"}
            </dt>
            <dd className="text-right">
              {collateralBank.position.amount} {collateralBank.meta.tokenSymbol}
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
    </>
  );
};
