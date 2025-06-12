import React, { useState, useMemo } from "react";
import { EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconSearch, IconSparkles } from "@tabler/icons-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { IconEmodeSimple } from "~/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DrawerContent,
  DrawerTrigger,
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "~/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { getEmodeStrategies } from "~/emode.utils";
import { useMrgnlendStore } from "~/store";

import { Desktop, Mobile } from "~/mediaQueryUtils";
import { ExploreView } from "./views/emode-explore.view";
import { StrategiesView } from "./views/emode-strategies.view";

export type EmodeStrategyType = {
  symbol: string;
  description: string;
  icon: string;
  action: ActionType;
  bank: ExtendedBankInfo;
};

interface EmodeExploreWrapperProps {
  trigger?: React.ReactNode;
  initialBank?: ExtendedBankInfo;
  emodeTag?: EmodeTag;
}

const EmodeExploreWrapper = ({ trigger, initialBank, emodeTag }: EmodeExploreWrapperProps) => {
  const [activeTab, setActiveTab] = useState<"explore" | "strategies">("explore");

  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const emodeStrategies = useMemo(() => {
    if (!extendedBankInfos) return [];

    const strategies: EmodeStrategyType[] = [];
    const {
      activateBorrowEmodeBanks,
      activateSupplyEmodeBanks,
      increaseSupplyEmodeBanks,
      blockingBorrowEmodeBanks,
      extendBorrowEmodeBanks,
    } = getEmodeStrategies(extendedBankInfos);

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

    extendBorrowEmodeBanks.forEach((bank) => {
      strategies.push({
        symbol: bank.meta.tokenSymbol,
        description: "Borrow " + bank.meta.tokenSymbol + " to extend e-mode boost.",
        icon: bank.meta.tokenLogoUri,
        action: ActionType.Borrow,
        bank,
      });
    });

    return strategies;
  }, [extendedBankInfos]);

  const defaultTrigger = (
    <Button variant="secondary" size="sm">
      <IconSearch size={12} />
      Explore e-mode
    </Button>
  );

  const tabsWrapper = (children: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center w-full gap-2 mb-8 md:mb-0">
      <Tabs
        defaultValue="explore"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "explore" | "strategies")}
        className="w-full"
      >
        <div className="w-full flex justify-between items-center">
          <span className="text-xl font-medium">Explore e-mode</span>
          <TabsList>
            <TabsTrigger value="explore">Pairs</TabsTrigger>
            {emodeStrategies.length > 0 ? (
              <TabsTrigger value="strategies">Strategies</TabsTrigger>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <TabsTrigger value="strategies" disabled>
                        Strategies
                      </TabsTrigger>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>No strategies available at the moment.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </TabsList>
        </div>
        {children}
      </Tabs>
    </div>
  );

  const getHeaderContent = (tab: "explore" | "strategies") => {
    if (tab === "explore") {
      return {
        title: (
          <>
            Explore{" "}
            <div className="flex items-center gap-1">
              <IconEmodeSimple size={32} />
              e-mode
            </div>
            {emodeTag && <span className="lowercase"> {EmodeTag[emodeTag]}</span>}
            pairs
          </>
        ),
        description: (
          <>
            View e-mode pairs and boosted weights.
            <br />
            For more information{" "}
            <Link
              href="https://docs.marginfi.com/emode"
              target="_blank"
              rel="noreferrer"
              className="border-b border-foreground/50 transition-colors hover:border-transparent"
            >
              read the documentation
            </Link>
            .
          </>
        ),
      };
    } else {
      return {
        title: (
          <>
            Explore{" "}
            <div className="flex items-center gap-1">
              <IconEmodeSimple size={32} />
              e-mode
            </div>
            strategies
          </>
        ),
        description: "There are strategies available to help you maximize your e-mode returns.",
      };
    }
  };

  const dialogHeader = (tab: "explore" | "strategies") => {
    const content = getHeaderContent(tab);
    return (
      <DialogHeader className="space-y-3 pt-4">
        <DialogTitle className="text-2xl font-normal flex items-center justify-center gap-2">
          {content.title}
        </DialogTitle>
        <DialogDescription className="text-center">{content.description}</DialogDescription>
      </DialogHeader>
    );
  };

  const drawerHeader = (tab: "explore" | "strategies") => {
    const content = getHeaderContent(tab);
    return (
      <DrawerHeader className="space-y-3 justify-center">
        <DrawerTitle className="text-2xl font-normal flex items-center justify-center gap-2">
          {content.title}
        </DrawerTitle>
        <DrawerDescription className="text-center">{content.description}</DrawerDescription>
      </DrawerHeader>
    );
  };

  const renderContent = (isDrawer: boolean) => {
    const headerComponent = isDrawer ? drawerHeader : dialogHeader;

    return tabsWrapper(
      <>
        <TabsContent value="explore" className="mt-0" hidden={activeTab !== "explore"}>
          {headerComponent("explore")}
          <div>
            <ExploreView initialBank={initialBank} />
          </div>
        </TabsContent>

        <TabsContent value="strategies" className="mt-0" hidden={activeTab !== "strategies"}>
          {headerComponent("strategies")}
          <div>
            {emodeStrategies.length > 0 ? (
              <StrategiesView emodeStrategies={emodeStrategies} />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <IconSparkles size={32} className="mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No strategies available at the moment.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check back later or explore e-mode pairs to find opportunities.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </>
    );
  };

  return (
    <>
      <Mobile>
        <Drawer>
          <DrawerTrigger asChild>{trigger || defaultTrigger}</DrawerTrigger>
          <DrawerContent className="px-6">{renderContent(true)}</DrawerContent>
        </Drawer>
      </Mobile>
      <Desktop>
        <Dialog>
          <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
          <DialogContent
            closeClassName="md:-top-8 md:-right-8 md:z-50"
            className="overflow-visible p-6 py-8 max-w-[500px]"
          >
            {renderContent(false)}
          </DialogContent>
        </Dialog>
      </Desktop>
    </>
  );
};

export { EmodeExploreWrapper };
