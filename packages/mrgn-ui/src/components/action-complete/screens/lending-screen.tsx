import React from "react";
import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress, dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { cn, computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

interface Props {
  amount: number;
  bank: ActiveBankInfo;
  type: ActionType;
  txn: string;
  txnLink?: string;
  collatRepay?: {
    borrowBank: ActiveBankInfo;
    withdrawBank: ActiveBankInfo;
    withdrawAmount: number;
  };
}

export const LendingScreen = ({ amount, bank, type, txn, txnLink, collatRepay }: Props) => {
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

  const updatedBankAmount = React.useMemo(() => {
    if (!amount || !bank.position) return 0;
    switch (type) {
      case ActionType.Deposit:
        return bank.position.amount + amount;
      case ActionType.Withdraw:
        return bank.position.amount - amount;
      case ActionType.Borrow:
        return bank.position.amount + amount;
      case ActionType.Repay:
        return bank.position.amount - amount;
      default:
        return bank.position.amount;
    }
  }, [amount, bank, type]);

  return (
    <>
      <div className="flex flex-col items-center gap-4 border-b border-border pb-10">
        {collatRepay ? (
          <div className="flex items-center">
            <Image
              className="rounded-full"
              src={collatRepay.borrowBank.meta.tokenLogoUri}
              alt={(collatRepay.borrowBank?.meta.tokenSymbol || "Token") + "  logo"}
              width={48}
              height={48}
            />
            <Image
              className="rounded-full -ml-5 relative z-10"
              src={collatRepay.withdrawBank.meta.tokenLogoUri}
              alt={(collatRepay.withdrawBank?.meta.tokenSymbol || "Token") + "  logo"}
              width={48}
              height={48}
            />
          </div>
        ) : (
          bank && (
            <Image
              className="rounded-full"
              src={bank.meta.tokenLogoUri}
              alt={(bank?.meta.tokenSymbol || "Token") + "  logo"}
              width={48}
              height={48}
            />
          )
        )}

        <div className="flex items-center justify-center gap-2">
          <h3 className="text-2xl font-medium text-center">
            {type === ActionType.RepayCollat ? (
              <>
                You repaid{" "}
                {dynamicNumeralFormatter(amount, {
                  tokenPrice: collatRepay?.borrowBank.info.state.price,
                })}{" "}
                {bank?.meta.tokenSymbol.toUpperCase()} with{" "}
                {dynamicNumeralFormatter(collatRepay?.withdrawAmount ?? 0, {
                  tokenPrice: collatRepay?.withdrawBank.info.state.price,
                })}{" "}
                {collatRepay?.withdrawBank.meta.tokenSymbol.toUpperCase()}
              </>
            ) : (
              <>
                You {type === ActionType.Deposit ? "deposited" : "borrowed"}{" "}
                {dynamicNumeralFormatter(amount, {
                  tokenPrice: bank?.info.state.price,
                })}{" "}
                {bank?.meta.tokenSymbol}
              </>
            )}
          </h3>
        </div>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        {bank?.position && (
          <>
            <dt>Total {bank.meta.tokenSymbol} Deposits</dt>
            <dd className="text-right">
              {dynamicNumeralFormatter(updatedBankAmount)} {bank.meta.tokenSymbol}
            </dd>
          </>
        )}
        <dt>APY</dt>
        <dd className={cn("text-right", actionTextColor)}>{rate}</dd>
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
