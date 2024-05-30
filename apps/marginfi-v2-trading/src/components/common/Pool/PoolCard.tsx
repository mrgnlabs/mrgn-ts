import Image from "next/image";
import Link from "next/link";
import random from "lodash/random";
import { shortenAddress, usdFormatter } from "@mrgnlabs/mrgn-common";
import { getTokenImageURL } from "~/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { IconTrendingDown, IconTrendingUp } from "~/components/ui/icons";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

type PoolCardProps = {
  bank: ExtendedBankInfo;
};

export const PoolCard = ({ bank }: PoolCardProps) => {
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
            {random(0, 1) ? (
              <IconTrendingUp className="text-success self-start ml-auto" />
            ) : (
              <IconTrendingDown className="text-error self-start ml-auto" />
            )}
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
            <strong className="font-medium text-primary">Deposits</strong>{" "}
            {usdFormatter.format(bank.info.state.totalDeposits)}
          </li>
          <li className="grid grid-cols-2">
            <strong className="font-medium text-primary">Borrows</strong>{" "}
            {usdFormatter.format(bank.info.state.totalBorrows)}
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-3 w-full">
          <Link href={`/trade/pools/${bank.address.toBase58()}`} className="w-full">
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
