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
  const [marginfiClient, selectedAccount, activeGroup, banks, collateralBanks, marginfiAccounts] = useTradeStore(
    (state) => [
      state.marginfiClient,
      state.selectedAccount,
      state.activeGroup,
      state.banks,
      state.collateralBanks,
      state.marginfiAccounts,
    ]
  );

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

  if (!activeGroup) {
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
          {portfolio.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <p className="text-sm text-muted-foreground pt-2">No positions found</p>
              </TableCell>
            </TableRow>
          ) : (
            <></>
          )}
          <TableRow className="even:bg-white/50 hover:even:bg-white/50">
            <TableCell>
              <Link
                href={`/pools/${activeGroup.token.address.toBase58()}`}
                className="flex items-center gap-3 transition-colors hover:text-mrgn-chartreuse"
              >
                <div className="flex ">
                  <Image
                    src={getTokenImageURL(activeGroup.token.meta.tokenSymbol)}
                    width={24}
                    height={24}
                    alt={activeGroup.token.meta.tokenSymbol}
                    className="rounded-full shrink-0"
                  />
                  <Image
                    src={getTokenImageURL(activeGroup.usdc.meta.tokenSymbol)}
                    width={24}
                    height={24}
                    alt={activeGroup.usdc.meta.tokenSymbol}
                    className="rounded-full shrink-0 ml-[-10px]"
                  />
                </div>{" "}
                {`${activeGroup.token.meta.tokenSymbol}/${activeGroup.usdc.meta.tokenSymbol} `}
              </Link>
            </TableCell>
            <TableCell>
              {activeGroup.token.isActive
                ? activeGroup.token.position.amount < 0.01
                  ? "0.01"
                  : numeralFormatter(activeGroup.token.position.amount)
                : 0}
            </TableCell>
            <TableCell>
              {activeGroup.usdc.isActive
                ? activeGroup.usdc.position.amount < 0.01
                  ? "0.01"
                  : numeralFormatter(activeGroup.usdc.position.amount)
                : 0}
            </TableCell>
            <TableCell>{usdFormatter.format(totalUsdValue)}</TableCell>

            <TableCell className="text-right">
              {selectedAccount && <LpActionButtons marginfiAccount={selectedAccount} activeGroup={activeGroup} />}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
