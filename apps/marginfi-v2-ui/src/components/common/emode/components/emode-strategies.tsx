import React from "react";

import Image from "next/image";
import { IconSparkles } from "@tabler/icons-react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { IconEmodeSimple } from "~/components/ui/icons";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import { Desktop, Mobile } from "~/mediaQueryUtils";
import {
  DrawerContent,
  DrawerTrigger,
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "~/components/ui/drawer";

import { getEmodeStrategies } from "~/emode.utils";
import { ActionBox, useWallet } from "~/components";
import { useMrgnlendStore } from "~/store";
import { capture } from "~/analytics";

const mockStrategies = [
  {
    name: "USDC",
    description: "Deposit USDC to enable e-mode rewards.",
    icon: "https://storage.googleapis.com/mrgn-public/mrgn-token-icons/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png",
    action: "Deposit",
  },
  {
    name: "SOL",
    description: "Deposit SOL to enable e-mode rewards.",
    icon: "https://storage.googleapis.com/mrgn-public/mrgn-token-icons/So11111111111111111111111111111111111111112.png",
    action: "Deposit",
  },
  {
    name: "LST",
    description: "Borrow LST to increase your e-mode rewards.",
    icon: "https://storage.googleapis.com/mrgn-public/mrgn-token-icons/LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp.png",
    action: "Borrow",
  },
];

type EmodeStrategiesType = {
  symbol: string;
  description: string;
  icon: string;
  action: ActionType;
  bank: ExtendedBankInfo;
};

type EmodeStrategiesProps = {
  extendedBankInfos: ExtendedBankInfo[];
};

const EmodeStrategies = ({ extendedBankInfos }: EmodeStrategiesProps) => {
  const { walletContextState, connected } = useWallet();

  const [fetchMrgnlendState, stakeAccounts] = useMrgnlendStore((state) => [
    state.fetchMrgnlendState,
    state.stakeAccounts,
  ]);

  const emodeStrategies = React.useMemo(() => {
    if (!extendedBankInfos) return [];

    const strategies: EmodeStrategiesType[] = [];
    const { activateBorrowEmodeBanks, activateSupplyEmodeBanks, increaseSupplyEmodeBanks, blockingBorrowEmodeBanks } =
      getEmodeStrategies(extendedBankInfos);

    activateBorrowEmodeBanks.forEach((bank) => {
      strategies.push({
        symbol: bank.meta.tokenSymbol,
        description: "Borrow " + bank.meta.tokenSymbol + " to enable e-mode boost.",
        icon: bank.meta.tokenLogoUri,
        action: ActionType.Borrow,
        bank,
      });
    });

    activateSupplyEmodeBanks.forEach((bank) => {
      strategies.push({
        symbol: bank.meta.tokenSymbol,
        description: "Deposit " + bank.meta.tokenSymbol + " to enable e-mode boost.",
        icon: bank.meta.tokenLogoUri,
        action: ActionType.Deposit,
        bank,
      });
    });

    increaseSupplyEmodeBanks.forEach((bank) => {
      strategies.push({
        symbol: bank.meta.tokenSymbol,
        description: "Deposit " + bank.meta.tokenSymbol + " to increase e-mode boost.",
        icon: bank.meta.tokenLogoUri,
        action: ActionType.Deposit,
        bank,
      });
    });

    blockingBorrowEmodeBanks.forEach((bank) => {
      strategies.push({
        symbol: bank.meta.tokenSymbol,
        description: "Repay " + bank.meta.tokenSymbol + " to activate e-mode boost.",
        icon: bank.meta.tokenLogoUri,
        action: ActionType.Repay,
        bank,
      });
    });

    return strategies;
  }, [extendedBankInfos]);

  const strategyTrigger = (
    <Button variant="secondary" size="sm" className="bg-gradient-to-r to-[#483975] from-[#292E32]">
      <IconSparkles size={18} /> e-mode strategies
    </Button>
  );

  const strategiesTable = (
    <div className="w-full">
      <Table>
        <TableBody>
          {emodeStrategies.map((strategy) => {
            return (
              <TableRow key={strategy.symbol} className="even:bg-accent">
                <TableCell className="p-3">
                  <div className="flex items-center gap-2.5">
                    <Image
                      src={strategy.icon}
                      alt={strategy.symbol}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
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
                      stakeAccounts: [],
                      captureEvent: (event, properties) => {
                        capture(event, properties);
                      },
                      onComplete: () => {
                        fetchMrgnlendState();
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

  return emodeStrategies.length > 0 ? (
    <>
      <Mobile>
        <Drawer>
          <DrawerTrigger asChild>{strategyTrigger}</DrawerTrigger>
          <DrawerContent className="overflow-visible p-2 pb-6 md:p-6 md:py-8">
            <DrawerHeader className="space-y-3">
              <DrawerTitle className="text-2xl font-normal flex items-center justify-center gap-2">
                Explore{" "}
                <div className="flex items-center gap-1">
                  <IconEmodeSimple size={32} />
                  e-mode
                </div>
                strategies
              </DrawerTitle>
              <DrawerDescription>
                There are strategies available to help you maximize your e-mode returns.
              </DrawerDescription>
            </DrawerHeader>
            {strategiesTable}
          </DrawerContent>
        </Drawer>
      </Mobile>
      <Desktop>
        <Dialog>
          <DialogTrigger asChild>{strategyTrigger}</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-normal flex items-center gap-2">
                Explore{" "}
                <div className="flex items-center gap-1">
                  <IconEmodeSimple size={32} />
                  e-mode
                </div>
                strategies
              </DialogTitle>
              <DialogDescription className="text-sm">
                There are strategies available to help you maximize your e-mode returns.
              </DialogDescription>
            </DialogHeader>
            {strategiesTable}
          </DialogContent>
        </Dialog>
      </Desktop>
    </>
  ) : (
    <></>
  );
};

export { EmodeStrategies };
