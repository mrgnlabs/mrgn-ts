import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { getTokenImageURL } from "~/utils";
import { useTradeStore } from "~/store";

import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { IconMinus, IconPlus, IconX } from "@tabler/icons-react";

export const PositionList = () => {
  const [initialized, selectedAccount, banks, collateralBanks] = useTradeStore((state) => [
    state.initialized,
    state.selectedAccount,
    state.banks,
    state.collateralBanks,
  ]);

  const portfolio = React.useMemo(() => {
    return banks.filter((bank) => bank.isActive) as ActiveBankInfo[];
  }, [banks]);

  return (
    <div className="rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[14%]">Position</TableHead>
            <TableHead className="w-[14%]">Token</TableHead>
            <TableHead className="w-[14%]">Size</TableHead>
            <TableHead className="w-[14%]">USD Value</TableHead>
            <TableHead className="w-[14%]">Price</TableHead>
            <TableHead className="w-[14%]">Liquidation price</TableHead>
            <TableHead className="w-[14%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {portfolio.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <p className="text-sm text-muted-foreground pt-2">No positions found</p>
              </TableCell>
            </TableRow>
          ) : (
            <></>
          )}

          {portfolio.map((bank, index) => {
            const collateralBank = collateralBanks[bank.address.toBase58()] || null;

            return (
              <TableRow key={index} className="even:bg-background-gray hover:even:bg-background-gray">
                <TableCell>
                  {bank.position.isLending ? (
                    <Badge className="bg-success uppercase font-medium">long</Badge>
                  ) : (
                    <Badge>short</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/pools/${bank.address.toBase58()}`}
                    className="flex items-center gap-3 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Image
                      src={getTokenImageURL(bank.meta.tokenSymbol)}
                      width={24}
                      height={24}
                      alt={bank.meta.tokenSymbol}
                      className="rounded-full shrink-0"
                    />{" "}
                    {bank.meta.tokenSymbol}
                  </Link>
                </TableCell>
                <TableCell>{bank.position.amount < 0.01 ? "0.01" : numeralFormatter(bank.position.amount)}</TableCell>
                <TableCell>{usdFormatter.format(bank.position.usdValue)}</TableCell>
                <TableCell>{usdFormatter.format(bank.info.oraclePrice.priceRealtime.price.toNumber())}</TableCell>
                <TableCell>
                  {bank.position.liquidationPrice ? (
                    <>
                      {bank.position.liquidationPrice > 0.01
                        ? usdFormatter.format(bank.position.liquidationPrice)
                        : `$${bank.position.liquidationPrice.toExponential(2)}`}
                    </>
                  ) : (
                    "n/a"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-3 justify-end">
                    <Button variant="secondary" size="sm" className="gap-1 min-w-16">
                      <IconPlus size={14} />
                      Add
                    </Button>
                    <Button variant="secondary" size="sm" className="gap-1 min-w-16">
                      <IconMinus size={14} />
                      Reduce
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-1 min-w-16">
                      <IconX size={14} />
                      Close
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
