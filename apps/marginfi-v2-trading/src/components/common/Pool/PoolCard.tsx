import React from "react";

import Image from "next/image";
import Link from "next/link";

import { shortenAddress, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { getTokenImageURL } from "~/utils";
import { useTradeStore } from "~/store";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";

type PoolCardProps = {
  bank: ExtendedBankInfo;
};

export const PoolCard = ({ bank }: PoolCardProps) => {
  const [collateralBanks] = useTradeStore((state) => [state.collateralBanks]);

  const totalDeposits = React.useMemo(() => {
    const collateralBank = collateralBanks[bank.address.toBase58()];
    const collateralDeposits = collateralBank
      ? collateralBank.info.state.totalDeposits * collateralBank.info.state.price
      : 0;
    const tokenDeposits = bank.info.state.totalDeposits * bank.info.state.price;

    return tokenDeposits + collateralDeposits;
  }, [collateralBanks, bank]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-3">
            <Image
              src={getTokenImageURL(bank.meta.tokenSymbol)}
              width={48}
              height={48}
              alt={bank.meta.tokenName}
              className="rounded-full"
            />{" "}
            <div className="flex flex-col space-y-1">
              <span>{bank.meta.tokenName}</span>
              <span className="text-muted-foreground text-sm">{bank.meta.tokenSymbol}</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground w-2/5">
          <li className="grid grid-cols-2">
            <strong className="font-medium text-primary">Address</strong>{" "}
            <Link
              href={`https://solscan.io/address/${bank.address.toBase58()}`}
              target="_blank"
              rel="noreferrer"
              className="text-chartreuse"
            >
              {shortenAddress(bank.address.toBase58())}
            </Link>
          </li>
          <li className="grid grid-cols-2">
            <strong className="font-medium text-primary">Deposits</strong> {usdFormatter.format(totalDeposits)}
          </li>
          <li className="grid grid-cols-2">
            <strong className="font-medium text-primary">Borrows</strong>{" "}
            {usdFormatter.format(bank.info.state.totalBorrows)}
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-3 w-full">
          <Link href={`/pools/${bank.address.toBase58()}`} className="w-full">
            <Button variant="secondary" className="w-full">
              View
            </Button>
          </Link>
          <Link href={`/trade/${bank.address.toBase58()}?poolsLink=true`} className="w-full">
            <Button variant="secondary" className="w-full">
              Trade
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};
