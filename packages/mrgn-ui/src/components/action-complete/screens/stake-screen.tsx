import React from "react";
import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { dynamicNumeralFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";

import { IconSol, IconLST } from "~/components/ui/icons";

interface Props {
  amount: number;
  type: ActionType;
  txn: string;
  originDetails: {
    amount: number;
    bank: ExtendedBankInfo;
  };
  txnLink?: string;
}

export const StakingScreen = ({ amount, type, txn, originDetails, txnLink }: Props) => {
  return (
    <>
      <div className="flex flex-col items-center gap-4 border-b border-border pb-10">
        <div className="flex items-center">
          <Image
            className="rounded-full"
            src={originDetails.bank.meta.tokenLogoUri}
            alt={(originDetails.bank.meta.tokenLogoUri || "Token") + "  logo"}
            width={48}
            height={48}
          />
          {type === ActionType.MintLST ? (
            <IconLST size={48} className="-ml-2 relative z-10" />
          ) : (
            <IconSol size={48} className="-ml-2 relative z-10" />
          )}
        </div>
        <h3 className="text-2xl font-medium">
          {/* {dynamicNumeralFormatter(amount)} {type === ActionType.MintLST ? "LST" : "SOL"} */}
          {type === ActionType.MintLST
            ? `You staked ${dynamicNumeralFormatter(originDetails.amount, {
                minDisplay: 0.01,
              })} ${originDetails.bank.meta.tokenSymbol.toUpperCase()} for ${dynamicNumeralFormatter(amount, {
                minDisplay: 0.01,
              })} LST`
            : `You swapped ${dynamicNumeralFormatter(originDetails.amount, {
                minDisplay: 0.01,
              })} LST for ${dynamicNumeralFormatter(amount, {
                minDisplay: 0.01,
              })} SOL`}
        </h3>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        <dt>Paid</dt>
        <dt className="text-right">
          {dynamicNumeralFormatter(originDetails?.amount, {
            minDisplay: 0.01,
          })}{" "}
          {originDetails?.bank.meta.tokenSymbol}
        </dt>
        <dt>Received</dt>
        <dt className="text-right">
          {dynamicNumeralFormatter(amount, {
            minDisplay: 0.01,
          })}{" "}
          {type === ActionType.MintLST ? "LST" : "SOL"}
        </dt>

        <dd>Transaction</dd>
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
