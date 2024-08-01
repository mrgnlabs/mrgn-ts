import React from "react";

import { aprToApy, numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { IconSortDescending } from "@tabler/icons-react";

import { useTradeStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { Loader } from "~/components/ui/loader";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { IconMrgn } from "~/components/ui/icons";
import Image from "next/image";
import { getTokenImageURL } from "~/utils";

export default function PortfolioPage() {
  const [initialized, banks, allBanks, collateralBanks, resetActiveGroup] = useTradeStore((state) => [
    state.initialized,
    state.banks,
    state.banksIncludingUSDC,
    state.collateralBanks,
    state.resetActiveGroup,
  ]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
        {!initialized && <Loader label="Loading portfolio..." className="mt-8" />}
        {initialized && (
          <div className="space-y-4">
            <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
              <PageHeading
                heading="Yield farming"
                body={<p>Nulla veniam tempor duis duis exercitation et ipsum ea consectetur elit mollit.</p>}
                links={[]}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="w-full">
                <Input placeholder="Search pools" />
              </div>
              <div>
                <Select>
                  <SelectTrigger className="w-[190px] justify-start gap-2">
                    <IconSortDescending size={16} />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">APY</SelectItem>
                    <SelectItem value="active">Total Deposits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="w-full">
              <div className="grid grid-cols-6 gap-4">
                <div>Pool</div>
                <div>Total Deposits</div>
                <div>Total Deposits (USD)</div>
                <div>APY</div>
                <div>Created by</div>
                <div />
                <div />
              </div>
              <div>
                {banks.map((bank) => {
                  const collateralBank = collateralBanks[bank.address.toBase58()];
                  return (
                    <>
                      <div className="grid grid-cols-6 gap-4 py-2" key={bank.address.toBase58()}>
                        <div className="flex items-center gap-2">
                          <Image
                            src={getTokenImageURL(bank.info.state.mint.toBase58())}
                            alt={bank.meta.tokenSymbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          {bank.meta.tokenSymbol}
                        </div>
                        <div>{numeralFormatter(bank.info.state.totalDeposits)}</div>
                        <div>
                          {usdFormatter.format(
                            bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber()
                          )}
                        </div>
                        <div>{percentFormatter.format(aprToApy(bank.info.state.lendingRate))}</div>
                        <div>
                          <IconMrgn size={24} />
                        </div>
                      </div>
                      <div className="grid grid-cols-6 gap-4 py-2" key={bank.address.toBase58()}>
                        <div className="flex items-center gap-2">
                          <Image
                            src={getTokenImageURL(collateralBank.info.state.mint.toBase58())}
                            alt={collateralBank.meta.tokenSymbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          {collateralBank.meta.tokenSymbol}
                        </div>
                        <div>{numeralFormatter(collateralBank.info.state.totalDeposits)}</div>
                        <div>
                          {usdFormatter.format(
                            collateralBank.info.state.totalDeposits *
                              collateralBank.info.oraclePrice.priceRealtime.price.toNumber()
                          )}
                        </div>
                        <div>{percentFormatter.format(aprToApy(collateralBank.info.state.lendingRate))}</div>
                        <div>
                          <IconMrgn size={24} />
                        </div>
                      </div>
                    </>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
