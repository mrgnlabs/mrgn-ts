import React from "react";
import Link from "next/link";
import Image from "next/image";

import { IconExternalLink } from "@tabler/icons-react";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { dynamicNumeralFormatter, percentFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { calcNetLoopingApy, calculateLstYield, cn } from "@mrgnlabs/mrgn-utils";

type LoopScreenProps = {
  depositBank: ActiveBankInfo;
  borrowBank: ActiveBankInfo;
  depositAmount: number;
  borrowAmount: number;
  leverage: number;
  txn: string;
  txnLink?: string;
};

export const LoopScreen = ({
  depositBank,
  borrowBank,
  depositAmount,
  borrowAmount,
  leverage,
  txn,
  txnLink,
}: LoopScreenProps) => {
  const [loopApy, setLoopApy] = React.useState<{ netApy: number; totalDepositApy: number; totalBorrowApy: number }>({
    netApy: 0,
    totalDepositApy: 0,
    totalBorrowApy: 0,
  });

  const calculateLoopingRate = React.useCallback(async () => {
    const lstDepositApy = await calculateLstYield(depositBank);
    const lstBorrowApy = await calculateLstYield(borrowBank);

    const { netApy, totalDepositApy, depositLstApy, totalBorrowApy, borrowLstApy } = calcNetLoopingApy(
      depositBank,
      borrowBank,
      lstDepositApy,
      lstBorrowApy,
      leverage
    );
    setLoopApy({
      netApy,
      totalDepositApy: totalDepositApy + depositLstApy,
      totalBorrowApy: totalBorrowApy + borrowLstApy,
    });
  }, [borrowBank, depositBank, leverage]);

  React.useEffect(() => {
    calculateLoopingRate();
  }, [calculateLoopingRate]);

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
            className="rounded-full -ml-3 relative z-10"
            src={borrowBank.meta.tokenLogoUri}
            alt={(borrowBank?.meta.tokenSymbol || "Token") + "  logo"}
            width={48}
            height={48}
          />
        </div>

        <div className="flex flex-col gap-1 justify-center items-center">
          <h3 className="text-2xl font-medium">
            You looped {dynamicNumeralFormatter(depositAmount, { minDisplay: 0.01 })}{" "}
            {depositBank.meta.tokenSymbol.toUpperCase()} with{" "}
            {dynamicNumeralFormatter(borrowAmount, { minDisplay: 0.01 })} {borrowBank.meta.tokenSymbol.toUpperCase()}
          </h3>
          <h4 className="text-md text-muted-foreground">Leverage: {leverage}x</h4>
        </div>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        <dt>Net APY</dt>
        <dd className={cn("text-right")}>{percentFormatter.format(Math.abs(loopApy.netApy))}</dd>
        <dt className="text-sm opacity-75">{depositBank.meta.tokenSymbol}</dt>
        <dd className="text-sm opacity-75 text-right text-success">
          {percentFormatter.format(loopApy.totalDepositApy)}
        </dd>
        <dt className="text-sm opacity-75">{borrowBank.meta.tokenSymbol}</dt>
        <dd className="text-sm opacity-75 text-right text-warning">
          {percentFormatter.format(loopApy.totalBorrowApy)}
        </dd>

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
