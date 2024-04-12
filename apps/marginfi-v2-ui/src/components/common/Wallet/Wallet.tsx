import React from "react";

import Image from "next/image";

import { useRouter } from "next/router";

import { CopyToClipboard } from "react-copy-to-clipboard";
import { shortenAddress, usdFormatter, numeralFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";

import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { showErrorToast } from "~/utils/toastUtils";
import { getTokenImageURL, cn } from "~/utils";

import {
  WalletAvatar,
  WalletTokens,
  Token as TokenType,
  WalletOnramp,
  WalletPkDialog,
  WalletIntroDialog,
  WalletNotis,
} from "~/components/common/Wallet";
import { Swap } from "~/components/common/Swap";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import {
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconLogout,
  IconArrowDown,
  IconArrowUp,
  IconRefresh,
  IconBell,
  IconArrowLeft,
  IconTrophy,
  IconKey,
  IconMoonPay,
} from "~/components/ui/icons";
import { WalletSend } from "./components/WalletSend";

enum WalletState {
  DEFAULT = "default",
  TOKEN = "token",
  SEND = "send",
  SELECT = "select",
  SWAP = "swap",
  POINTS = "points",
  NOTIS = "notis",
}

export const Wallet = () => {
  const router = useRouter();
  const [extendedBankInfos, nativeSolBalance, initialized] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.initialized,
  ]);
  const [isWalletOpen, setIsWalletOpen] = useUiStore((state) => [state.isWalletOpen, state.setIsWalletOpen]);
  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData, state.fetchPoints]);

  const { wallet, logout, pfp, requestPrivateKey, web3AuthPk, web3AuthConncected, walletContextState } =
    useWalletContext();

  const [isFetchingWalletData, setIsFetchingWalletData] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [isWalletAddressCopied, setisWalletAddressCopied] = React.useState(false);
  const [walletData, setWalletData] = React.useState<{
    address: string;
    shortAddress: string;
    balanceUSD: string;
    tokens: TokenType[];
  }>({
    address: "",
    shortAddress: "",
    balanceUSD: "",
    tokens: [],
  });
  const [walletTokenState, setWalletTokenState] = React.useState<WalletState>(WalletState.DEFAULT);
  const [activeToken, setActiveToken] = React.useState<TokenType | null>(null);
  const [isSwapLoaded, setIsSwapLoaded] = React.useState(false);

  const activeBank = React.useMemo(() => {
    if (!activeToken) return null;
    return extendedBankInfos.find((bank) => bank.address.equals(activeToken.address));
  }, [activeToken, extendedBankInfos]);

  const resetWalletState = React.useCallback(() => {
    setWalletTokenState(WalletState.DEFAULT);
    setActiveToken(null);
  }, []);

  const getWalletData = React.useCallback(async () => {
    if (isFetchingWalletData || !wallet?.publicKey || !extendedBankInfos || isNaN(nativeSolBalance)) return;

    setIsFetchingWalletData(true);

    const userBanks = extendedBankInfos.filter(
      (bank) => bank.userInfo.tokenAccount.balance !== 0 || bank.meta.tokenSymbol === "SOL"
    );

    const prioritizedSymbols = ["SOL", "LST"];

    const userTokens = userBanks
      .map((bank) => {
        const isSolBank = bank.meta.tokenSymbol === "SOL";
        const value = isSolBank
          ? nativeSolBalance + bank.userInfo.tokenAccount.balance
          : bank.userInfo.tokenAccount.balance;
        const valueUSD =
          (isSolBank ? nativeSolBalance + bank.userInfo.tokenAccount.balance : bank.userInfo.tokenAccount.balance) *
          bank.info.state.price;

        return {
          address: bank.address,
          name: isSolBank ? "Solana" : bank.meta.tokenName,
          image: getTokenImageURL(bank.meta.tokenSymbol),
          symbol: bank.meta.tokenSymbol,
          value: value,
          valueUSD: valueUSD,
          formattedValue: value < 0.01 ? `< 0.01` : numeralFormatter(value),
          formattedValueUSD: usdFormatter.format(valueUSD),
        };
      })
      .sort((a, b) => {
        return (
          (prioritizedSymbols.includes(b.symbol) ? 1 : 0) - (prioritizedSymbols.includes(a.symbol) ? 1 : 0) ||
          b.valueUSD - a.valueUSD
        );
      });

    // attempt to fetch cached totalBalanceData
    const cacheKey = `marginfi_totalBalanceData-${wallet?.publicKey.toString()}`;
    const cachedData = localStorage.getItem(cacheKey);
    let totalBalance = 0;
    let totalBalanceStr = "";

    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const now = new Date();
      // 5 minute expiration time on cache
      if (now.getTime() - parsedData.timestamp < 5 * 60 * 1000) {
        totalBalance = parsedData.totalValue;
        totalBalanceStr = usdFormatter.format(totalBalance);
      }
    }

    if (!totalBalanceStr) {
      const totalBalanceRes = await fetch(`/api/user/wallet?wallet=${wallet?.publicKey}`);
      if (totalBalanceRes.ok) {
        const totalBalanceData = await totalBalanceRes.json();
        totalBalance = totalBalanceData.totalValue;
        totalBalanceStr = usdFormatter.format(totalBalance);
        // update cache
        localStorage.setItem(cacheKey, JSON.stringify({ totalValue: totalBalance, timestamp: new Date().getTime() }));
      }
    }

    // show error toast
    if (!totalBalanceStr) {
      showErrorToast("Error fetching wallet balance");
    }

    setWalletData({
      address: wallet?.publicKey.toString(),
      shortAddress: shortenAddress(wallet?.publicKey.toString()),
      balanceUSD: usdFormatter.format(totalBalance),
      tokens: (userTokens || []) as TokenType[],
    });

    setIsFetchingWalletData(false);
  }, [wallet?.publicKey, extendedBankInfos, nativeSolBalance, isFetchingWalletData]);

  // fetch wallet data on mount and every 20 seconds
  React.useEffect(() => {
    if (isMounted) return;
    setIsMounted(true);

    getWalletData();
    const intervalId = setInterval(() => {
      getWalletData();
    }, 20000);

    return () => {
      clearInterval(intervalId);
    };
  }, [getWalletData, isMounted]);

  return (
    <>
      <Sheet open={isWalletOpen} onOpenChange={(open) => setIsWalletOpen(open)}>
        <SheetTrigger asChild>
          {walletData.address && initialized && (
            <button className="flex items-center gap-2 hover:bg-muted transition-colors rounded-full py-0.5 pr-2 pl-1 text-sm text-muted-foreground">
              <WalletAvatar pfp={pfp} address={walletData.address} size="sm" />
              {walletData.shortAddress}
              <IconChevronDown size={16} />
            </button>
          )}
        </SheetTrigger>
        <SheetContent className="outline-none z-[1000001] px-4 bg-background border-0">
          {walletData.address ? (
            <div className="max-h-full">
              <header className="flex items-center gap-2">
                <WalletAvatar pfp={pfp} address={walletData.address} size="md" className="absolute left-2" />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="mx-auto">
                        <CopyToClipboard
                          text={walletData.address}
                          onCopy={() => {
                            setisWalletAddressCopied(true);
                            setTimeout(() => {
                              setisWalletAddressCopied(false);
                            }, 2000);
                          }}
                        >
                          <Button variant="secondary" size="sm" className="text-sm">
                            {!isWalletAddressCopied ? (
                              <>
                                {walletData.shortAddress} <IconCopy size={16} />
                              </>
                            ) : (
                              <>
                                Copied! <IconCheck size={16} />
                              </>
                            )}
                          </Button>
                        </CopyToClipboard>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy wallet address</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className={cn("absolute right-2 flex items-center gap-1", web3AuthConncected && "gap-0.5")}>
                  {web3AuthConncected && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(walletTokenState === WalletState.NOTIS && "text-chartreuse")}
                            onClick={() => {
                              localStorage.setItem("mrgnPrivateKeyRequested", "true");
                              requestPrivateKey();
                            }}
                          >
                            <IconKey size={18} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Export private key</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(walletTokenState === WalletState.NOTIS && "text-chartreuse")}
                          onClick={() => {
                            setWalletTokenState(
                              walletTokenState === WalletState.NOTIS ? WalletState.DEFAULT : WalletState.NOTIS
                            );
                          }}
                        >
                          <IconBell size={18} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Notification settings</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => logout()} className="shrink-0">
                          <IconLogout size={18} className="translate-x-0.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Disconnect wallet</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </header>
              {walletTokenState === WalletState.NOTIS && (
                <div className="relative pt-8 space-y-4">
                  <button
                    className="flex items-center gap-1 text-sm text-muted-foreground"
                    onClick={() => resetWalletState()}
                  >
                    <IconArrowLeft size={16} /> back
                  </button>
                  <WalletNotis />
                </div>
              )}

              {walletTokenState !== WalletState.NOTIS && (
                <Tabs defaultValue="tokens" className="py-8">
                  <TabsList className="flex items-center gap-4 bg-transparent px-16 mx-auto">
                    <TabsTrigger
                      value="tokens"
                      className="group w-1/3 bg-transparent data-[state=active]:bg-transparent"
                      onClick={() => resetWalletState()}
                    >
                      <span className="group-data-[state=active]:bg-background-gray-light hover:bg-background-gray-light/75 py-1.5 px-3 rounded-md">
                        Tokens
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="points"
                      className="group w-1/3 bg-transparent data-[state=active]:bg-transparent"
                    >
                      <span className="group-data-[state=active]:bg-background-gray-light hover:bg-background-gray-light/75 py-1.5 px-3 rounded-md">
                        Points
                      </span>
                    </TabsTrigger>
                    <div className="cursor-help inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="py-1.5 px-3 rounded-md opacity-50">Activity</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Coming soon</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TabsList>
                  <TabsContent value="tokens">
                    {walletTokenState === WalletState.DEFAULT && (
                      <div className="space-y-6 py-8">
                        <h2 className="text-4xl font-medium text-center">{walletData.balanceUSD}</h2>
                        <TokenOptions
                          walletAddress={walletData.address}
                          setState={setWalletTokenState}
                          web3AuthConnected={web3AuthConncected}
                        />
                        <WalletTokens
                          className="h-[calc(100vh-325px)] pb-16"
                          tokens={walletData.tokens}
                          onTokenClick={(token) => {
                            setActiveToken(token);
                            setWalletTokenState(WalletState.TOKEN);
                          }}
                        />
                      </div>
                    )}

                    {walletTokenState === WalletState.TOKEN && activeToken && (
                      <div className="py-4">
                        <div className="relative flex flex-col pt-6 gap-2">
                          <button
                            className="absolute top-0 left-12 flex items-center gap-1 text-sm text-muted-foreground"
                            onClick={() => resetWalletState()}
                          >
                            <IconArrowLeft size={16} /> back
                          </button>
                          <div className="gap-2 text-center flex flex-col items-center">
                            <Image
                              src={getTokenImageURL(activeToken.symbol)}
                              alt={activeToken.symbol}
                              width={60}
                              height={60}
                              className="rounded-full"
                            />
                            <div className="space-y-0">
                              <h2 className="font-medium text-3xl">
                                {activeToken.value < 0.01
                                  ? "< 0.01"
                                  : numeralFormatter(activeToken.value) + " " + activeToken.symbol}
                              </h2>
                              <p className="text-muted-foreground">{usdFormatter.format(activeToken.valueUSD)}</p>
                            </div>
                          </div>
                          <div className="mt-6">
                            <TokenOptions
                              walletAddress={walletData.address}
                              setState={setWalletTokenState}
                              setToken={() => {
                                setActiveToken(activeToken);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {walletTokenState === WalletState.SEND && (
                      <div className="py-4">
                        <div className="relative flex flex-col pt-6 gap-2">
                          <button
                            className="absolute top-0 left-12 flex items-center gap-1 text-sm text-muted-foreground"
                            onClick={() => resetWalletState()}
                          >
                            <IconArrowLeft size={16} /> back
                          </button>
                          {activeToken && (
                            <WalletSend
                              activeToken={activeToken}
                              onSendMore={() => {
                                setWalletTokenState(WalletState.SEND);
                              }}
                              onBack={() => {
                                setWalletTokenState(WalletState.DEFAULT);
                                setActiveToken(null);
                              }}
                              onRetry={() => {
                                setWalletTokenState(WalletState.SEND);
                              }}
                              onCancel={() => {
                                setWalletTokenState(WalletState.TOKEN);
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                    {walletTokenState === WalletState.SELECT && (
                      <div className="relative pt-12">
                        <button
                          className="absolute top-4 left-2 flex items-center gap-1 text-sm text-muted-foreground"
                          onClick={() => resetWalletState()}
                        >
                          <IconArrowLeft size={16} /> back
                        </button>
                        <WalletTokens
                          className="h-[calc(100vh-235px)]"
                          tokens={walletData.tokens}
                          onTokenClick={(token) => {
                            setActiveToken(token);
                            setWalletTokenState(WalletState.SEND);
                          }}
                        />
                      </div>
                    )}
                    {walletTokenState === WalletState.SWAP && (
                      <div className="relative py-4">
                        <div className="max-w-[420px] px-3 transition-opacity" id="integrated-terminal"></div>
                        <Swap
                          onLoad={() => {
                            setIsSwapLoaded(true);
                          }}
                          initialInputMint={activeBank?.info.state.mint}
                        />
                        {isSwapLoaded && (
                          <div className="px-5">
                            <Button
                              variant="destructive"
                              size="lg"
                              className="w-full"
                              onClick={() => resetWalletState()}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="points">
                    <div className="flex flex-col items-center pt-8">
                      <p className="font-medium text-4xl flex flex-col justify-center">
                        <span className="text-sm font-normal text-chartreuse text-center">Your points</span>
                        {groupedNumberFormatterDyn.format(Math.round(userPointsData.totalPoints))}
                      </p>
                      {userPointsData.userRank && (
                        <div className="flex flex-col items-center justify-center text-xl p-4 bg-background-gray-dark/40 rounded-lg font-medium leading-tight">
                          <span className="text-sm font-normal text-chartreuse">Your rank</span> #
                          {groupedNumberFormatterDyn.format(userPointsData.userRank)}
                        </div>
                      )}
                      <ul className="space-y-2 mt-4">
                        <li>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              setIsWalletOpen(false);
                              router.push("/points");
                            }}
                          >
                            <IconTrophy size={16} /> Points Leaderboard
                          </Button>
                        </li>
                        <li>
                          <Button variant="outline" className="w-full justify-start">
                            <IconCopy size={16} /> Copy referral code
                          </Button>
                        </li>
                      </ul>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </SheetContent>
      </Sheet>

      {web3AuthConncected && (
        <>
          <WalletPkDialog pk={web3AuthPk} />
          <WalletIntroDialog />
          <WalletOnramp />
        </>
      )}
    </>
  );
};

type TokenOptionsProps = {
  walletAddress: string;
  setState: (state: WalletState) => void;
  setToken?: () => void;
  web3AuthConnected?: boolean;
};

function TokenOptions({ walletAddress, setState, setToken, web3AuthConnected = false }: TokenOptionsProps) {
  const [setIsOnrampActive] = useUiStore((state) => [state.setIsOnrampActive]);
  const [isWalletAddressCopied, setIsWalletAddressCopied] = React.useState(false);
  return (
    <div className="flex items-center justify-center gap-4">
      <CopyToClipboard
        text={walletAddress}
        onCopy={() => {
          setIsWalletAddressCopied(true);
          setTimeout(() => {
            setIsWalletAddressCopied(false);
          }, 2000);
        }}
      >
        <button className="flex flex-col gap-1 text-sm font-medium items-center">
          {!isWalletAddressCopied ? (
            <>
              <div className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray">
                <IconArrowDown size={20} />
              </div>
              Receive
            </>
          ) : (
            <>
              <div className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray">
                <IconCheck size={20} />
              </div>
              Copied!
            </>
          )}
        </button>
      </CopyToClipboard>
      <button
        className="flex flex-col gap-1 text-sm font-medium items-center"
        onClick={() => {
          if (!setToken && !setToken) {
            setState(WalletState.SELECT);
            return;
          }

          if (setToken) setToken();
          setState(WalletState.SEND);
        }}
      >
        <div className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray">
          <IconArrowUp size={20} />
        </div>
        Send
      </button>
      <button
        className="flex flex-col gap-1 text-sm font-medium items-center"
        onClick={() => {
          setState(WalletState.SWAP);
        }}
      >
        <div className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray">
          <IconRefresh size={20} />
        </div>
        Swap
      </button>
      {web3AuthConnected && (
        <button
          className="flex flex-col gap-1 text-sm font-medium items-center"
          onClick={() => {
            setIsOnrampActive(true);
          }}
        >
          <div className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray">
            <IconMoonPay size={20} />
          </div>
          On ramp
        </button>
      )}
    </div>
  );
}
