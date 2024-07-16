import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { IconMinus, IconPlus, IconX } from "@tabler/icons-react";

import { getTokenImageURL } from "~/utils";
import { useTradeStore } from "~/store";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { LpActionButtons, PositionActionButtons } from "~/components/common/Portfolio";
import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ActiveGroup } from "~/store/tradeStore";

export const LpPositionList = () => {
  const [marginfiClient, marginfiAccounts, activeGroup, banks, collateralBanks] = useTradeStore((state) => [
    state.marginfiClient,
    state.marginfiAccounts,
    state.activeGroup,
    state.banks,
    state.collateralBanks,
  ]);

  const portfolio = React.useMemo(() => {
    const filteredBanks = banks.filter((bank) => bank.isActive) as ActiveBankInfo[];
    return filteredBanks.sort((a, b) => a.position.usdValue - b.position.usdValue);
  }, [banks]);

  const totalUsdValue = React.useMemo(() => {
    if (!activeGroup) return 0;
    const tokenValue = activeGroup.token.isActive ? activeGroup.token.position.usdValue : 0;
    const usdcValue = activeGroup.usdc.isActive ? activeGroup.usdc.position.usdValue : 0;

    return tokenValue + usdcValue;
  }, [activeGroup]);

  if (!portfolio) {
    return <></>;
  }

  return (
    <div className="rounded-xl">
      <Table className="min-w-[600px] overflow-auto">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[20%]">Pool</TableHead>
            <TableHead className="w-[20%]">Token Size</TableHead>
            <TableHead className="w-[20%]">USDC Size</TableHead>
            <TableHead className="w-[20%]">USD Value</TableHead>
            <TableHead className="w-[20%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {portfolio.map((bank, i) => {
            const collateralBank = collateralBanks[bank.address.toBase58()];
            const marginfiAccount = marginfiAccounts ? marginfiAccounts[bank.info.rawBank.group.toBase58()] : undefined;
            const borrowBank = bank.position.isLending ? collateralBank : bank;
            const isBorrowing = borrowBank.isActive && !borrowBank.position.isLending;
            const activeGroup: ActiveGroup = {
              usdc: collateralBank,
              token: bank,
            };

            if (!collateralBank) return;
            return (
              <TableRow key={i} className="even:bg-white/50 hover:even:bg-white/50">
                <TableCell>
                  <Link
                    href={`/pools/${bank.address.toBase58()}`}
                    className="flex items-center gap-3 transition-colors hover:text-mrgn-chartreuse"
                  >
                    <div className="flex">
                      <Image
                        src={getTokenImageURL(bank.meta.tokenSymbol)}
                        width={24}
                        height={24}
                        alt={bank.meta.tokenSymbol}
                        className="rounded-full shrink-0 z-20"
                      />
                      <Image
                        src={getTokenImageURL(collateralBank.meta.tokenSymbol)}
                        width={24}
                        height={24}
                        alt={collateralBank.meta.tokenSymbol}
                        className="rounded-full shrink-0 ml-[-12px] z-10"
                      />
                    </div>{" "}
                    {`${bank.meta.tokenSymbol}/${collateralBank.meta.tokenSymbol} `}
                  </Link>
                </TableCell>
                <TableCell>
                  {bank.isActive ? (bank.position.amount < 0.01 ? "0.01" : numeralFormatter(bank.position.amount)) : 0}
                </TableCell>
                <TableCell>
                  {collateralBank.isActive
                    ? collateralBank.position.amount < 0.01
                      ? "0.01"
                      : numeralFormatter(collateralBank.position.amount)
                    : 0}
                </TableCell>
                <TableCell>{usdFormatter.format(totalUsdValue)}</TableCell>

                <TableCell className="text-right">
                  {marginfiAccounts && <LpActionButtons marginfiAccount={marginfiAccount} activeGroup={activeGroup} />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
