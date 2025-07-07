import React from "react";
import Image from "next/image";
import { IconSparkles } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";

import { ActionBox, useWallet } from "~/components";
import { capture } from "~/analytics";
import { EmodeStrategyType } from "..";
import { useRefreshUserData } from "@mrgnlabs/mrgn-state";
import { PublicKey } from "@solana/web3.js";

interface StrategiesViewProps {
  emodeStrategies: EmodeStrategyType[];
}

export const StrategiesView = ({ emodeStrategies }: StrategiesViewProps) => {
  const { walletContextState, connected, walletAddress } = useWallet();

  const refreshUserData = useRefreshUserData();

  if (emodeStrategies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <IconSparkles size={32} className="mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">No strategies available at the moment.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Check back later or explore e-mode pairs to find opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full mt-8">
      <Table>
        <TableBody>
          {emodeStrategies.map((strategy) => {
            return (
              <TableRow key={strategy.symbol} className="even:bg-accent">
                <TableCell className="p-3">
                  <div className="flex items-center gap-2.5">
                    <Image src={strategy.icon} alt={strategy.symbol} width={32} height={32} className="rounded-full" />
                    {strategy.symbol}
                  </div>
                </TableCell>
                <TableCell className="p-3">
                  <p className="text-xs">{strategy.description}</p>
                </TableCell>
                <TableCell className="text-right p-3">
                  <ActionBox.Lend
                    useProvider={true}
                    lendProps={{
                      requestedLendType: strategy.action,
                      requestedBank: strategy.bank,
                      walletContextState: walletContextState,
                      connected: connected,
                      captureEvent: (event, properties) => {
                        capture(event, properties);
                      },
                      onComplete: (newAccountKey?: PublicKey) => {
                        refreshUserData({ newAccountKey });
                      },
                    }}
                    isDialog={true}
                    dialogProps={{
                      trigger: (
                        <Button size="sm" className="w-full">
                          {strategy.action}
                        </Button>
                      ),
                      title: `${strategy.action} ${strategy.bank?.meta.tokenSymbol}`,
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
