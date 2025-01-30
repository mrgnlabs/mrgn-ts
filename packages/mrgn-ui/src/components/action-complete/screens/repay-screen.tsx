import React from "react";
import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress, dynamicNumeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";
import { cn, getRateData } from "@mrgnlabs/mrgn-utils";

interface Props {
  type: ActionType;
  txn: string;
  txnLink?: string;
  selectedBank: ActiveBankInfo;
  selectedSecondaryBank: ActiveBankInfo;
  repayAmount: number;
  withdrawAmount: number;
}

export const RepayScreen = ({
  selectedBank,
  selectedSecondaryBank,
  type,
  txn,
  txnLink,
  repayAmount,
  withdrawAmount,
}: Props) => {
  const actionTextColor = React.useMemo(() => {
    const successTypes = [ActionType.Deposit, ActionType.Withdraw, ActionType.MintLST];
    const warningTypes = [ActionType.Borrow, ActionType.Repay];
    if (successTypes.includes(type!)) return "text-success";
    if (warningTypes.includes(type!)) return "text-warning";
    return "";
  }, [type]);

  const rate = React.useMemo(() => {
    return getRateData(selectedBank, type === ActionType.Deposit || type === ActionType.Withdraw);
  }, [selectedBank, type]);

  const updatedAmounts = React.useMemo(() => {
    if (type === ActionType.RepayCollat) {
      return {
        selectedBank: selectedBank.position.amount - repayAmount,
        selectedSecondaryBank: selectedSecondaryBank.position.amount - withdrawAmount,
      };
    }
    return {
      selectedBank: selectedBank.position.amount - repayAmount,
    };
  }, [selectedBank, selectedSecondaryBank, type, repayAmount, withdrawAmount]);

  return (
    <>
      <div className="flex flex-col items-center gap-4 border-b border-border pb-10">
        {type === ActionType.RepayCollat ? (
          <div className="flex items-center">
            <Image
              className="rounded-full"
              src={selectedBank.meta.tokenLogoUri}
              alt={(selectedBank?.meta.tokenSymbol || "Token") + "  logo"}
              width={48}
              height={48}
            />
            <Image
              className="rounded-full -ml-5 relative z-10"
              src={selectedSecondaryBank.meta.tokenLogoUri}
              alt={(selectedSecondaryBank?.meta.tokenSymbol || "Token") + "  logo"}
              width={48}
              height={48}
            />
          </div>
        ) : (
          selectedBank && (
            <Image
              className="rounded-full"
              src={selectedBank.meta.tokenLogoUri}
              alt={(selectedBank?.meta.tokenSymbol || "Token") + "  logo"}
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
                {dynamicNumeralFormatter(repayAmount, {
                  tokenPrice: selectedBank.info.state.price,
                })}{" "}
                {selectedBank?.meta.tokenSymbol.toUpperCase()} with{" "}
                {dynamicNumeralFormatter(withdrawAmount, {
                  tokenPrice: selectedSecondaryBank.info.state.price,
                })}{" "}
                {selectedSecondaryBank.meta.tokenSymbol.toUpperCase()}
              </>
            ) : (
              <>
                You repaid{" "}
                {dynamicNumeralFormatter(repayAmount, {
                  tokenPrice: selectedBank.info.state.price,
                })}{" "}
                {selectedBank?.meta.tokenSymbol}
              </>
            )}
          </h3>
        </div>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        {selectedBank?.position && (
          <>
            <dt>Total {selectedBank.meta.tokenSymbol} Borrow</dt>
            <dd className="text-right">
              {dynamicNumeralFormatter(updatedAmounts.selectedBank, { minDisplay: 0.01 })}{" "}
              {selectedBank.meta.tokenSymbol}
            </dd>
          </>
        )}
        {type === ActionType.RepayCollat && (
          <>
            <dt>Total {selectedSecondaryBank.meta.tokenSymbol} Collateral</dt>
            <dd className="text-right">
              {dynamicNumeralFormatter(updatedAmounts.selectedSecondaryBank ?? 0, {
                minDisplay: 0.01,
              })}{" "}
              {selectedSecondaryBank.meta.tokenSymbol}
            </dd>
          </>
        )}
        <dt>APY</dt>
        <dd className={cn("text-right", actionTextColor)}>{percentFormatter.format(rate.rateAPY)}</dd>
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
