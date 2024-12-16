import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";
import { QuoteResponse } from "@jup-ag/api";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { dynamicNumeralFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

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
      <div className="flex flex-col items-center gap-4 border-b border-border pb-10">
        <div className="flex items-center">
          <Image
            className="rounded-full"
            src={depositBank.meta.tokenLogoUri}
            alt={(depositBank?.meta.tokenSymbol || "Token") + "  logo"}
            width={48}
            height={48}
          />
          <Image
            className="rounded-full -ml-5 relative z-10"
            src={borrowBank.meta.tokenLogoUri}
            alt={(borrowBank?.meta.tokenSymbol || "Token") + "  logo"}
            width={48}
            height={48}
          />
        </div>

        <div className="flex flex-col gap-2 justify-center items-center text-center">
          <h3 className="text-2xl font-medium text-center">
            You {type === "long" ? "longed" : "shorted"} {depositBank.meta.tokenSymbol.toUpperCase()}/
            {borrowBank.meta.tokenSymbol.toUpperCase()} for{" "}
            {type === "long"
              ? `${dynamicNumeralFormatter(depositAmount, {
                  minDisplay: 0.0001,
                })} ${depositBank.meta.tokenSymbol.toUpperCase()}`
              : `${dynamicNumeralFormatter(depositAmount, {
                  minDisplay: 0.0001,
                })} ${depositBank.meta.tokenSymbol.toUpperCase()}`}
          </h3>
          <h4 className="text-xl text-muted-foreground">Leverage: {leverage}x</h4>
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
