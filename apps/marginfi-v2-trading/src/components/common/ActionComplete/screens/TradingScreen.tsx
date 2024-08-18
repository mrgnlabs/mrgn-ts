import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";
import { QuoteResponse } from "@jup-ag/api";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress } from "@mrgnlabs/mrgn-common";

import { cn, getTokenImageURL } from "~/utils";
import { PublicKey } from "@solana/web3.js";

interface Props {
  depositBank: ActiveBankInfo;
  borrowBank: ActiveBankInfo;
  type: "long" | "short";
  txn: string;
  initDepositAmount: string;
  entryPrice: number;
  depositAmount: number;
  borrowAmount: number;
  leverage: number;
  quote: QuoteResponse;
}

export const TradingScreen = ({
  depositBank,
  borrowBank,
  type,
  txn,
  entryPrice,
  initDepositAmount,
  depositAmount,
  borrowAmount,
  leverage,
  quote,
}: Props) => {
  const tokenBank = React.useMemo(() => (type === "long" ? depositBank : borrowBank), [type, depositBank, borrowBank]);

  if (!tokenBank) {
    return <></>;
  }

  return (
    <>
      <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-4xl font-medium">
            {`${(type === "long" ? depositAmount : borrowAmount).toFixed(2)}`} {tokenBank.meta.tokenSymbol}
          </h3>
          <Image
            className="rounded-full w-9 h-9"
            src={tokenBank?.info?.state?.mint && getTokenImageURL(new PublicKey(tokenBank.info.state.mint).toBase58())}
            alt={(tokenBank.meta.tokenSymbol || "Token") + "  logo"}
            width={36}
            height={36}
          />
        </div>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        <dt>Position Type</dt>
        <dd className="text-right capitalize">{type}</dd>
        <dt>Token</dt>
        <dd className={cn("text-right", type === "long" ? "text-success" : "text-warning")}>
          {type === "long"
            ? `${depositBank.meta.tokenName} (${depositBank.meta.tokenSymbol})`
            : `${borrowBank.meta.tokenName} (${borrowBank.meta.tokenSymbol})`}
        </dd>
        <dt>Leverage</dt>
        <dd className="text-right">{`${leverage}x`}</dd>
        {/* <dt>Token</dt>
        <dd className={cn("text-right", actionTextColor)}>{rateAP}</dd> */}
        <dt>Transaction</dt>
        <dd className="text-right">
          <Link
            href={`https://solscan.io/tx/${txn}`}
            className="flex items-center justify-end gap-1.5 text-foreground text-sm underline hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="border-b">{shortenAddress(txn || "")}</span>{" "}
            <IconExternalLink size={15} className="-translate-y-[1px]" />
          </Link>
        </dd>
      </dl>
    </>
  );
};
