import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, tokenPriceFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { getTokenImageURL } from "~/utils";
import { useTradeStore } from "~/store";

import { PositionActionButtons } from "~/components/common/Portfolio";
import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { ActiveGroup } from "~/store/tradeStore";

export const PositionList = () => {
  const [marginfiClient, banks, collateralBanks, marginfiAccounts] = useTradeStore((state) => [
    state.marginfiClient,
    state.banks,
    state.collateralBanks,
    state.marginfiAccounts,
  ]);

  const portfolio = React.useMemo(() => {
    const activeBanks = banks.filter((bank) => bank.isActive);
    const longBanks = activeBanks.filter((bank) => {
      const collateralBank = collateralBanks[bank.address.toBase58()];
      return bank.isActive && bank.position.isLending && collateralBank.isActive && !collateralBank.position.isLending;
    }) as ActiveBankInfo[];
    const shortBanks = activeBanks.filter((bank) => {
      const collateralBank = collateralBanks[bank.address.toBase58()];
      return bank.isActive && !bank.position.isLending && collateralBank.isActive && collateralBank.position.isLending;
    }) as ActiveBankInfo[];

    if (!longBanks.length && !shortBanks.length) return [];

    return [...longBanks, ...shortBanks].sort((a, b) => a.position.usdValue - b.position.usdValue);
  }, [banks, collateralBanks]);

  return (
    <div className="rounded-xl">
      <Table className="min-w-[1080px] overflow-auto">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[14%]">Position</TableHead>
            <TableHead className="w-[14%]">Token</TableHead>
            <TableHead className="w-[14%]">Size</TableHead>
            <TableHead className="w-[14%]">Leverage</TableHead>
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
            const marginfiAccount = marginfiAccounts ? marginfiAccounts[bank.info.rawBank.group.toBase58()] : undefined;
            const borrowBank = bank.position.isLending ? collateralBank : bank;
            const depositBank = bank.address.equals(borrowBank.address) ? collateralBank : bank;
            const isBorrowing = borrowBank.isActive && !borrowBank.position.isLending;
            const activeGroup: ActiveGroup = {
              usdc: collateralBank,
              token: bank,
            };

            const usdValue =
              (depositBank.isActive ? depositBank.position.usdValue : 0) -
              (borrowBank.isActive ? borrowBank.position.usdValue : 0);

            let leverage = 1;
            if (borrowBank.isActive && depositBank.isActive) {
              const borrowUsd = borrowBank.position.usdValue;
              const depositUsd = depositBank.position.usdValue;

              leverage = Math.round((borrowUsd / depositUsd + Number.EPSILON) * 100) / 100 + 1;
            }

            return (
              <TableRow key={index} className="even:bg-white/50 hover:even:bg-white/50">
                <TableCell>
                  {bank.position.isLending ? (
                    <Badge className="w-14 bg-success uppercase font-medium justify-center">long</Badge>
                  ) : (
                    <Badge className="w-14 bg-error uppercase font-medium justify-center">short</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/pools/${bank.address.toBase58()}`}
                    className="flex items-center gap-3 transition-colors hover:text-mrgn-chartreuse"
                  >
                    <Image
                      src={getTokenImageURL(bank.info.state.mint.toBase58())}
                      width={24}
                      height={24}
                      alt={bank.meta.tokenSymbol}
                      className="rounded-full shrink-0"
                    />{" "}
                    {bank.meta.tokenSymbol}
                  </Link>
                </TableCell>
                <TableCell>{bank.position.amount < 0.01 ? "0.01" : numeralFormatter(bank.position.amount)}</TableCell>
                <TableCell>{`${leverage}x`}</TableCell>
                <TableCell>{usdFormatter.format(usdValue)}</TableCell>
                <TableCell>
                  {bank.info.oraclePrice.priceRealtime.price.toNumber() > 0.00001
                    ? tokenPriceFormatter.format(bank.info.oraclePrice.priceRealtime.price.toNumber())
                    : `$${bank.info.oraclePrice.priceRealtime.price.toExponential(2)}`}
                </TableCell>
                <TableCell>
                  {bank.position.liquidationPrice ? (
                    <>
                      {bank.position.liquidationPrice > 0.00001
                        ? tokenPriceFormatter.format(bank.position.liquidationPrice)
                        : `$${bank.position.liquidationPrice.toExponential(2)}`}
                    </>
                  ) : (
                    "n/a"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {marginfiAccounts && (
                    <PositionActionButtons
                      marginfiClient={marginfiClient}
                      marginfiAccount={marginfiAccount}
                      isBorrowing={isBorrowing}
                      bank={bank}
                      activeGroup={activeGroup}
                      collateralBank={collateralBank}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
