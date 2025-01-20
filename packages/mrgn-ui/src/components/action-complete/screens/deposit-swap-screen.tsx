import React from "react";
import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";
import { shortenAddress, dynamicNumeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";
import { cn, getRateData } from "@mrgnlabs/mrgn-utils";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

interface Props {
  swapAmount: number;
  depositAmount: number;
  depositBank: ActiveBankInfo;
  swapBank: ActiveBankInfo;
  txn: string;
  txnLink?: string;
}

export const DepositSwapScreen = ({ swapAmount, depositAmount, depositBank, swapBank, txn, txnLink }: Props) => {
  const rate = React.useMemo(() => {
    return getRateData(depositBank, false);
  }, [depositBank]);

  return (
    <>
      <div className="flex flex-col items-center gap-4 border-b border-border pb-10">
        <div className="flex items-center">
          <Image
            className="rounded-full"
            src={swapBank.meta.tokenLogoUri}
            alt={(swapBank.meta.tokenSymbol || "Token") + " logo"}
            width={48}
            height={48}
          />
          <Image
            className="rounded-full -ml-5 relative z-10"
            src={depositBank.meta.tokenLogoUri}
            alt={(depositBank.meta.tokenSymbol || "Token") + " logo"}
            width={48}
            height={48}
          />
        </div>

        <div className="flex items-center justify-center gap-2">
          <h3 className="text-2xl font-medium text-center">
            You deposited{" "}
            {dynamicNumeralFormatter(swapAmount, {
              tokenPrice: swapBank.info.state.price,
            })}{" "}
            {swapBank.meta.tokenSymbol.toUpperCase()} as{" "}
            {dynamicNumeralFormatter(depositAmount, {
              tokenPrice: depositBank.info.state.price,
            })}{" "}
            {depositBank.meta.tokenSymbol.toUpperCase()}
          </h3>
        </div>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        <dt>Total {depositBank.meta.tokenSymbol} Deposited</dt>
        <dd className="text-right">
          {dynamicNumeralFormatter(depositAmount, { minDisplay: 0.01 })} {depositBank.meta.tokenSymbol}
        </dd>
        <dt>Total {swapBank.meta.tokenSymbol} Swapped</dt>
        <dd className="text-right">
          {dynamicNumeralFormatter(swapAmount, { minDisplay: 0.01 })} {swapBank.meta.tokenSymbol}
        </dd>
        <dt>APY</dt>
        <dd className={cn("text-right text-success")}>{percentFormatter.format(rate.rateAPY)}</dd>

        <dt>Transaction</dt>
        <dd className="text-right">
          <Link
            href={txnLink || `https://solscan.io/tx/${txn}`}
            className="flex items-center justify-end gap-1.5 text-primary text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="border-b border-border">{shortenAddress(txn || "")}</span>{" "}
            <IconExternalLink size={15} className="-translate-y-[1px]" />
          </Link>
        </dd>
      </dl>
    </>
  );
};
