import React from "react";
import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";

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
      <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-4xl font-medium">
            {amount <= 0.01 ? "<0.01" : numeralFormatter(amount)} {type === ActionType.MintLST ? "LST" : "SOL"}
          </h3>
          {type === ActionType.MintLST ? <IconLST size={32} /> : <IconSol />}
        </div>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        <dt>Paid</dt>
        <dt className="text-right">
          {numeralFormatter(originDetails?.amount)} {originDetails?.bank.meta.tokenSymbol}
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
