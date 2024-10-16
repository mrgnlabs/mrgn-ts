import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn, computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

interface Props {
  amount: number;
  bank: ActiveBankInfo;
  type: ActionType;
  txn: string;
}

export const StakingScreen = ({ amount, bank, type, txn }: Props) => {
  return (
    <>
      <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-4xl font-medium">
            {amount} {type === ActionType.MintLST ? "LST" : "SOL"}
          </h3>
          {bank && (
            <Image
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
        <dt>Transaction</dt>
        <dd className="text-right">
          <Link
            href={`https://solscan.io/tx/${txn}`}
            className="flex items-center justify-end gap-1.5 text-chartreuse text-sm"
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
