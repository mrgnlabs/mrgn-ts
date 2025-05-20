import React, { FC, useMemo, useState } from "react";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { IconMrgn } from "~/components/ui/icons";
import {
  IconBell,
  IconBrandTelegram,
  IconSearch,
  IconSettings,
  IconUserCircle,
  IconX,
  IconChevronDown,
  IconChevronRightPipe,
  IconChevronRight,
  IconLogout,
  IconKey,
  IconInfoCircleFilled,
} from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { ResponsiveSettingsWrapper } from "~/components/settings/settings-wrapper";
import { useAppStore, useUiStore } from "~/store";
import MixinWallet from "../MixinWallet/MixinWallet";
import { Drawer, DrawerPortal, DrawerContent, DrawerTrigger, DrawerOverlay, DrawerClose } from "~/components/ui/drawer";
import { LoginModal } from "../MixinWallet";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { useConnection } from "~/hooks/use-connection";
import {
  Sheet,
  SheetPortal,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

// @todo implement second pretty navbar row
export const Navbar: FC = () => {
  const router = useRouter();
  const connection = useConnection();

  const [initialized, setInitialized] = React.useState(false);

  const {
    priorityType,
    broadcastType,
    priorityFees,
    maxCapType,
    setTransactionSettings,
    accountLabels,
    fetchAccountLabels,
    displaySettings,
    setDisplaySettings,
    jupiterOptions,
    setJupiterOptions,
    setGlobalActionBoxProps,
    globalActionBoxProps,
  } = useUiStore((state) => ({
    priorityType: state.priorityType,
    broadcastType: state.broadcastType,
    priorityFees: state.priorityFees,
    maxCapType: state.maxCapType,
    setTransactionSettings: state.setTransactionSettings,
    accountLabels: state.accountLabels,
    fetchAccountLabels: state.fetchAccountLabels,
    displaySettings: state.displaySettings,
    setDisplaySettings: state.setDisplaySettings,
    jupiterOptions: state.jupiterOptions,
    setJupiterOptions: state.setJupiterOptions,
    setGlobalActionBoxProps: state.setGlobalActionBoxProps,
    globalActionBoxProps: state.globalActionBoxProps,
  }));

  const { user, balances, getMixinClient, setKeystore, clear } = useAppStore((s) => ({
    user: s.user,
    balances: s.balances,
    getMixinClient: s.getMixinClient,
    setKeystore: s.setKeystore,
    clear: s.clear,
  }));

  const isLoggedIn = !!user;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("assets");
  const [searchTerm, setSearchTerm] = useState("");

  const handleAvatarClick = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    }
  };

  const handleLogout = () => {
    clear();
    return;
  };

  const filteredBalances = Object.values(balances).filter(
    (balance) =>
      balance.asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      balance.asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAssetUsdValue = (balance: any) => {
    return Number(balance.total_amount) * (Number(balance.asset.price_usd) || 0);
  };

  const sortedBalances = [...filteredBalances].sort((a, b) => {
    const aUsdValue = getAssetUsdValue(a);
    const bUsdValue = getAssetUsdValue(b);

    return bUsdValue - aUsdValue;
  });

  const totalBalance = Object.values(balances).reduce(
    (acc, balance) => acc + Number(balance.total_amount) * (Number(balance.asset.price_usd) || 0),
    0
  );

  return (
    <header className="h-[64px] mb-4 md:mb-8 lg:mb-14">
      <nav className="fixed w-full top-0 h-[64px] z-50 bg-background">
        <div className="w-full flex justify-between items-center h-16 text-sm font-[500] text-[#868E95] z-10 border-b-[0.5px] border-[#1C2125] px-4">
          <div className="h-full w-1/2 z-10 flex items-center gap-8">
            {!isLoggedIn && (
              <>
                <Button
                  variant="default"
                  size="default"
                  className="flex items-center gap-2 bg-accent hover:bg-accent/70 text-secondary-foreground transition-all rounded-full py-2 px-6 text-sm font-medium"
                  aria-label="Login"
                  onClick={handleAvatarClick}
                >
                  {/* <IconUserCircle size={20} className="text-primary-foreground" stroke={1.5} /> */}
                  Connect Wallet
                </Button>
              </>
            )}
            {/* <Link
              href="/"
              className="h-[35.025px] w-[31.0125px] min-h-[35.025px] min-w-[31.0125px] flex justify-center items-center text-white"
            >
              <IconMrgn size={35} />
            </Link> */}

            <div className="flex items-center md:pl-12">
              {isLoggedIn && (
                <Sheet open={isWalletOpen} onOpenChange={setIsWalletOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center h-full gap-3 bg-accent/50 hover:bg-accent/80 transition-all rounded-full py-2 px-4 text-sm text-muted-foreground font-normal shrink-0"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>
                          <IconUserCircle
                            size={32}
                            className="text-nav-light-text dark:text-nav-dark-text"
                            stroke={1.5}
                          />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start">
                        <span className="font-aeonik text-base text-nav-light-text dark:text-nav-dark-text">
                          {user?.full_name || "未登录"}
                        </span>
                        <span className="text-xs text-muted-foreground">{user?.identity_number || ""}</span>
                      </div>
                      <IconChevronDown size={16} className="ml-2" />
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="left" className="w-full h-full">
                    <div className="flex items-center justify-between mb-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-accent/50 transition-all"
                        onClick={() => setIsWalletOpen(false)}
                      >
                        <IconX className="h-5 w-5" />
                      </Button>
                      <SheetHeader>
                        <SheetTitle>钱包</SheetTitle>
                        <SheetDescription>管理你的资产和设置</SheetDescription>
                      </SheetHeader>
                      <div className="w-8" />
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="assets">资产</TabsTrigger>
                        <TabsTrigger value="settings">设置</TabsTrigger>
                      </TabsList>

                      <TabsContent value="assets" className="mt-6">
                        <div className="space-y-4">
                          <div className="text-center">
                            <h3 className="text-2xl font-bold">资产概览</h3>
                            <p className="text-muted-foreground mt-2">总资产: ${totalBalance.toFixed(2)}</p>
                          </div>

                          <div className="space-y-2 h-[calc(100vh-280px)] overflow-y-auto pr-2">
                            {sortedBalances.map((balance) => (
                              <div
                                key={balance.asset.symbol}
                                className="flex items-center justify-between p-4 bg-accent/50 rounded-lg hover:bg-accent/70 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage src={balance.asset.icon_url} />
                                    <AvatarFallback>{balance.asset.symbol[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-medium truncate max-w-[150px]" title={balance.asset.name}>
                                      {balance.asset.name}
                                    </span>
                                    <span
                                      className="text-sm text-muted-foreground truncate max-w-[150px]"
                                      title={balance.asset.symbol}
                                    >
                                      {balance.asset.symbol}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-medium truncate max-w-[120px]" title={balance.total_amount}>
                                    {balance.total_amount}
                                  </div>
                                  <div
                                    className="text-sm text-muted-foreground truncate max-w-[120px]"
                                    title={`≈ $${getAssetUsdValue(balance).toFixed(2)}`}
                                  >
                                    ≈ ${getAssetUsdValue(balance).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="settings">
                        <div className="mt-6 space-y-4">
                          <Button variant="outline" className="w-full justify-between" onClick={handleLogout}>
                            断开连接
                            <IconLogout size={18} />
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </SheetContent>
                </Sheet>
              )}
            </div>

            <LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />

            <div className="hidden lg:flex justify-start items-center gap-8">
              <Link
                href={"/"}
                className={`${
                  router.pathname === "/" ? "text-primary hover-underline-static" : "hover-underline-animation"
                }`}
              >
                lend
              </Link>

              {/* <Link
                href={"/stake"}
                className={
                  router.pathname === "/stake" ? "text-primary hover-underline-static" : "hover-underline-animation"
                }
              >
                stake
              </Link> */}

              {/* <Link
                href={"/looper"}
                className={
                  router.pathname === "/looper" ? "text-primary hover-underline-static" : "hover-underline-animation"
                }
              >
                looper
              </Link> */}

              <Link
                href={"/portfolio"}
                className={`${
                  router.pathname === "/portfolio" ? "text-primary hover-underline-static" : "hover-underline-animation"
                } whitespace-nowrap`}
              >
                portfolio
              </Link>

              {/* {lipAccount && lipAccount.deposits.length > 0 && (
                <Link
                  href={"/earn"}
                  className={
                    router.pathname === "/earn" ? "text-primary hover-underline-static" : "hover-underline-animation"
                  }
                >
                  earn
                </Link>
              )} */}
              {/* 
              <Link
                href="/ecosystem"
                className={`${
                  router.pathname === "/ecosystem" ? "text-primary hover-underline-static" : "hover-underline-animation"
                } whitespace-nowrap`}
              >
                ecosystem
              </Link> */}
            </div>
          </div>
          {
            <div className="pr-20 h-full w-1/2 flex justify-end items-center z-10 gap-2 sm:gap-4 text-[#868E95]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  console.log("globalActionBoxProps", globalActionBoxProps);
                  setGlobalActionBoxProps({ ...globalActionBoxProps, isOpen: !globalActionBoxProps.isOpen });
                }}
                className="w-10 h-10 shrink-0 flex lg:hidden rounded-full hover:bg-accent/50 transition-all"
              >
                <IconSearch size={20} className="text-muted-foreground" />
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  console.log("globalActionBoxProps", globalActionBoxProps);
                  setGlobalActionBoxProps({ ...globalActionBoxProps, isOpen: !globalActionBoxProps.isOpen });
                }}
                className="hidden lg:flex items-center justify-between w-56 h-10 px-4 rounded-full bg-accent/50 hover:bg-accent/80 text-muted-foreground transition-all"
              >
                <span className="text-sm">Search pools...</span>
                <span className="text-xs bg-accent/50 px-2 py-1 rounded-md">⌘ K</span>
              </Button>

              {/* 
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-lg">
                    <IconBell size={20} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="flex flex-col items-center justify-center text-center gap-4">
                    <div className="flex flex-col items-center justify-center text-center gap-2">
                      <Image
                        src="https://storage.googleapis.com/mrgn-public/ecosystem-images/asgardwatchbot.jpg"
                        alt="Asgard Heimdall"
                        width={52}
                        height={52}
                        className="rounded-full"
                      />
                      <h2 className="text-lg font-medium">Asgard Watchbot</h2>
                      <p className="text-sm">
                        Sign up for real time notifications with Asgardfi&apos;s telegram watchbot.
                      </p>
                    </div>
                    <Link
                      href="https://t.me/AsgardWatchBot"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        // capture("asgard_watchbot_clicked");
                      }}
                    >
                      <Button variant="secondary" size="sm">
                        <IconBrandTelegram size={18} /> Open in Telegram
                      </Button>
                    </Link>
                  </div>
                </PopoverContent>
              </Popover> */}

              <ResponsiveSettingsWrapper
                transactionOptions={{
                  broadcastType,
                  priorityType,
                  maxCap: priorityFees.maxCapUi ?? 0,
                  maxCapType,
                }}
                jupiterOptions={{ ...jupiterOptions, slippageBps: jupiterOptions.slippageBps / 100 }}
                onTransactionOptionsChange={(settings) => setTransactionSettings(settings, connection.connection)}
                onJupiterOptionsChange={(settings) => setJupiterOptions(settings)}
                settingsDialogOpen={displaySettings}
                setSettingsDialogOpen={setDisplaySettings}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full hover:bg-accent/50 transition-all"
                >
                  <IconSettings size={20} className="text-muted-foreground" />
                </Button>
              </ResponsiveSettingsWrapper>

              {/* <Wallet
                connection={connection}
                initialized={initialized}
                userDataFetched={userDataFetched}
                mfiClient={mfiClient}
                marginfiAccounts={marginfiAccounts}
                selectedAccount={selectedAccount}
                extendedBankInfos={extendedBankInfos}
                nativeSolBalance={nativeSolBalance}
                userPointsData={userPointsData}
                accountSummary={accountSummary}
                refreshState={fetchMrgnlendState}
                processOpts={{
                  ...priorityFees,
                  broadcastType,
                }}
                accountLabels={accountLabels}
                fetchAccountLabels={fetchAccountLabels}
              /> */}
            </div>
          }
        </div>
      </nav>
    </header>
  );
};
