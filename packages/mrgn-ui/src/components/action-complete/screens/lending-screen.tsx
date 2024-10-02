import React from "react";
import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn, getTokenImageURL, computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

interface Props {
  amount: number;
  bank: ActiveBankInfo;
  type: ActionType;
  txn: string;
}

export const LendingScreen = ({ amount, bank, type, txn }: Props) => {
  const actionTextColor = React.useMemo(() => {
    const successTypes = [ActionType.Deposit, ActionType.Withdraw, ActionType.MintLST];
    const warningTypes = [ActionType.Borrow, ActionType.Repay];
    if (successTypes.includes(type!)) return "text-success";
    if (warningTypes.includes(type!)) return "text-warning";
    return "";
  }, [type]);

  const rate = React.useMemo(() => {
    return computeBankRate(bank, type === ActionType.Deposit ? LendingModes.LEND : LendingModes.BORROW);
  }, [bank, type]);

  return (
    <>
      <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-4xl font-medium">
            {amount} {bank?.meta.tokenSymbol}
          </h3>
          {bank && (
            <Image
              className="rounded-full w-9 h-9"
              src={getTokenImageURL(bank.info.state.mint.toString())}
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
        <dd className={cn("text-right", actionTextColor)}>{rate}</dd>
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
