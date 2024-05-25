import Image from "next/image";
import Link from "next/link";

import random from "lodash/random";
import { shortenAddress, usdFormatter } from "@mrgnlabs/mrgn-common";

import { getTokenImageURL } from "~/utils";
import { useMrgnlendStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import {
  IconSearch,
  IconSortDescending,
  IconFilter,
  IconTrendingUp,
  IconTrendingDown,
  IconPlus,
} from "~/components/ui/icons";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "~/components/ui/card";
import { Loader } from "~/components/ui/loader";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export default function TradePage() {
  const [initialized, extendedBankInfos] = useMrgnlendStore((state) => [state.initialized, state.extendedBankInfos]);
  return (
    <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28">
      {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
      {initialized && (
        <>
          <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
            <PageHeading
              heading={<h1>mrgntrade</h1>}
              body={<p>Create permissionless pools, provide liquidity, and trade with mrgntrade.</p>}
              links={[]}
              button={
                <Link href="/trade/pools/create">
                  <Button>
                    <IconPlus size={18} /> Create a pool
                  </Button>
                </Link>
              }
            />
          </div>

          <div className="w-full space-y-8 px-4 lg:px-8 pt-8 pb-16">
            <div className="flex items-center gap-4">
              <div className="relative w-full">
                <IconSearch size={18} className="absolute inset-y-0 left-4 h-full" />
                <Input placeholder="Search token names / symbols" className="py-2 pr-3 pl-12 h-10 rounded-lg" />
              </div>
              <div className="flex items-center gap-4 ml-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="lg" className="py-2 h-10">
                      <IconSortDescending size={20} /> Sort
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80"></PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="lg" className="py-2 h-10">
                      <IconFilter size={20} /> Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80"></PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {extendedBankInfos.map((bank, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle>
                      <div className="flex items-center gap-3">
                        <Image
                          src={getTokenImageURL(bank.meta.tokenSymbol)}
                          width={48}
                          height={48}
                          alt={`Pool ${i + 1}`}
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
                          Long
                        </Button>
                      </Link>
                      <Link href={`/trade/pools/${bank.address.toBase58()}`} className="w-full">
                        <Button variant="secondary" className="w-full">
                          Short
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
