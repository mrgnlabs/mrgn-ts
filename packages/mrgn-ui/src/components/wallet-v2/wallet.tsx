import React from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  IconChevronDown,
  IconCopy,
  IconLogout,
  IconArrowUp,
  IconRefresh,
  IconBell,
  IconArrowLeft,
  IconTrophy,
  IconKey,
  IconX,
  IconArrowsExchange,
  IconCreditCardPay,
  IconCheck,
} from "@tabler/icons-react";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, UserPointsData } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress, usdFormatter, numeralFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { getTokenImageURL, showErrorToast, useIsMobile, cn } from "@mrgnlabs/mrgn-utils";

import { useWalletStore } from "~/components/wallet-v2/wallet.store";
import { useWallet } from "~/components/wallet-v2/wallet.hooks";

import {
  WalletButton,
  WalletAvatar,
  WalletTokens,
  Token as TokenType,
  WalletOnramp,
  WalletPkDialog,
  WalletNotis,
  WalletSend,
  WalletAuthAccounts,
} from "~/components/wallet-v2/components";
import { Swap } from "~/components/swap";
import { Bridge } from "~/components/bridge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "~/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

type WalletProps = {
  initialized: boolean;
  mfiClient: MarginfiClient;
  marginfiAccounts: MarginfiAccountWrapper[];
  selectedAccount: MarginfiAccountWrapper | null;
  extendedBankInfos: ExtendedBankInfo[];
  nativeSolBalance: number;
  userPointsData: UserPointsData;
};

enum WalletState {
  DEFAULT = "default",
  TOKEN = "token",
  SEND = "send",
  SELECT = "select",
  SWAP = "swap",
  BUY = "bug",
  BRIDGE = "bridge",
  POINTS = "points",
  NOTIS = "notis",
}

const Wallet = ({
  initialized,
  mfiClient,
  marginfiAccounts,
  selectedAccount,
  extendedBankInfos,
  nativeSolBalance,
  userPointsData,
}: WalletProps) => {
  const router = useRouter();

  const [isWalletOpen, setIsWalletOpen] = useWalletStore((state) => [state.isWalletOpen, state.setIsWalletOpen]);

  const { wallet, connected, logout, pfp, requestPrivateKey, web3AuthPk, web3AuthConncected, isLoading } = useWallet();

  const debounceId = React.useRef<NodeJS.Timeout | null>(null);
  const isFetchingWalletDataRef = React.useRef(false);
  const [isWalletAddressCopied, setIsWalletAddressCopied] = React.useState(false);
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
  const [isReferralCopied, setIsReferralCopied] = React.useState(false);
  const [bridgeType, setBridgeType] = React.useState<"mayan" | "debridge">("mayan");
  const [isWalletBalanceErrorShown, setIsWalletBalanceErrorShown] = React.useState(false);
  const prevIsWalletOpenRef = React.useRef(isWalletOpen);

  const isMobile = useIsMobile();

  const activeBank = React.useMemo(() => {
    if (!activeToken) return null;
    return extendedBankInfos.find((bank) => bank.address.equals(activeToken.address));
  }, [activeToken, extendedBankInfos]);

  const resetWalletState = React.useCallback(() => {
    setWalletTokenState(WalletState.DEFAULT);
    setActiveToken(null);
  }, []);

  const getWalletData = React.useCallback(async () => {
    if (isFetchingWalletDataRef.current || !wallet?.publicKey || !extendedBankInfos || isNaN(nativeSolBalance)) return;

    isFetchingWalletDataRef.current = true;
    setIsWalletBalanceErrorShown(false);

    try {
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

      let totalBalance = 0;
      let totalBalanceStr = "0.00";

      const totalBalanceRes = await fetch(`/api/user/wallet?wallet=${wallet?.publicKey}`);
      if (totalBalanceRes.ok) {
        const totalBalanceData = await totalBalanceRes.json();
        totalBalance = totalBalanceData.totalValue;
        totalBalanceStr = usdFormatter.format(totalBalance);
      }

      setWalletData({
        address: wallet?.publicKey.toString(),
        shortAddress: shortenAddress(wallet?.publicKey.toString()),
        balanceUSD: usdFormatter.format(totalBalance),
        tokens: (userTokens || []) as TokenType[],
      });
    } catch (error) {
      if (!isWalletBalanceErrorShown) {
        showErrorToast("Error fetching wallet balance");
        setIsWalletBalanceErrorShown(true);
      }
      setWalletData({
        address: wallet?.publicKey.toString(),
        shortAddress: shortenAddress(wallet?.publicKey.toString()),
        balanceUSD: usdFormatter.format(0),
        tokens: [],
      });
    } finally {
      isFetchingWalletDataRef.current = false;
    }
  }, [wallet?.publicKey, extendedBankInfos, nativeSolBalance, isWalletBalanceErrorShown]);

  React.useEffect(() => {
    if (!walletData.address) {
      getWalletData();
      return;
    }

    if (isWalletOpen && isWalletOpen !== prevIsWalletOpenRef.current) {
      getWalletData();
    }
    prevIsWalletOpenRef.current = isWalletOpen;
  }, [isWalletOpen, getWalletData, walletData.address]);

  return (
    <>
      {!isLoading && !connected && <WalletButton />}
      <Sheet open={isWalletOpen} onOpenChange={(open) => setIsWalletOpen(open)}>
        <SheetTrigger asChild>
          {walletData.address && (
            <button className="flex items-center gap-2 hover:bg-background-gray-light transition-colors rounded-full py-0.5 pr-2 pl-1 text-sm text-muted-foreground">
              <WalletAvatar pfp={pfp} address={walletData.address} size="sm" />
              {walletData.shortAddress}
              <IconChevronDown size={16} />
            </button>
          )}
        </SheetTrigger>
        <SheetContent className="outline-none z-[50] px-4 bg-background border-0">
          <SheetHeader className="sr-only">
            <SheetTitle>marginfi wallet</SheetTitle>
            <SheetDescription>Manage your marginfi wallet.</SheetDescription>
          </SheetHeader>
          {walletData.address ? (
            <div className="max-h-full">
              <header className="flex items-center gap-2">
                <WalletAvatar pfp={pfp} address={walletData.address} size="md" className="absolute left-2" />

                <div className="mx-auto">
                  <WalletAuthAccounts
                    initialized={initialized}
                    mfiClient={mfiClient}
                    marginfiAccounts={marginfiAccounts}
                    selectedAccount={selectedAccount}
                    fetchMrgnlendState={function (): Promise<void> {
                      throw new Error("Function not implemented.");
                    }}
                  />
                </div>
                <div className="absolute right-2 flex items-center md:gap-1">
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
                          className={cn(
                            web3AuthConncected && "hidden lg:flex",
                            walletTokenState === WalletState.NOTIS && "text-chartreuse"
                          )}
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
                        <Button variant="ghost" size="icon" onClick={logout} className="shrink-0">
                          <IconLogout size={18} className="translate-x-0.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Disconnect wallet</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setIsWalletOpen(false);
                      }}
                      className="shrink-0"
                    >
                      <IconX size={18} className="translate-x-0.5" />
                    </Button>
                  )}
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
                    <div className="cursor-help w-1/3 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">
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
                        <div className="">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <CopyToClipboard
                                    text={walletData.address}
                                    onCopy={() => {
                                      setIsWalletAddressCopied(true);
                                      setTimeout(() => {
                                        setIsWalletAddressCopied(false);
                                      }, 2000);
                                    }}
                                  >
                                    <button className="flex w-full gap-1 font-medium items-center justify-center text-center text-xs text-muted-foreground">
                                      {!isWalletAddressCopied ? (
                                        <>
                                          <IconCopy size={16} /> Copy wallet address
                                        </>
                                      ) : (
                                        <>
                                          <IconCheck size={16} />
                                          Copied! ({shortenAddress(walletData.address)})
                                        </>
                                      )}
                                    </button>
                                  </CopyToClipboard>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{shortenAddress(walletData.address)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
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
                      <TabWrapper resetWalletState={resetWalletState}>
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
                      </TabWrapper>
                    )}

                    {walletTokenState === WalletState.SEND && (
                      <TabWrapper resetWalletState={resetWalletState}>
                        {activeToken && (
                          <WalletSend
                            activeToken={activeToken}
                            extendedBankInfos={extendedBankInfos}
                            nativeSolBalance={nativeSolBalance}
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
                      </TabWrapper>
                    )}
                    {walletTokenState === WalletState.BUY && (
                      <TabWrapper resetWalletState={resetWalletState}>
                        <div className="px-4">
                          <WalletOnramp showAmountBackButton={false} />
                        </div>
                      </TabWrapper>
                    )}
                    {walletTokenState === WalletState.SELECT && (
                      <TabWrapper resetWalletState={resetWalletState}>
                        <WalletTokens
                          className="h-[calc(100vh-235px)]"
                          tokens={walletData.tokens}
                          onTokenClick={(token) => {
                            setActiveToken(token);
                            setWalletTokenState(WalletState.SEND);
                          }}
                        />
                      </TabWrapper>
                    )}
                    {walletTokenState === WalletState.SWAP && (
                      <TabWrapper resetWalletState={resetWalletState}>
                        <div className="max-w-[590px] mx-auto px-3 transition-opacity" id="integrated-terminal"></div>
                        <Swap
                          onLoad={() => {
                            setIsSwapLoaded(true);
                          }}
                          initialInputMint={activeBank?.info.state.mint}
                        />
                      </TabWrapper>
                    )}
                    {walletTokenState === WalletState.BRIDGE && (
                      <TabWrapper resetWalletState={resetWalletState}>
                        <ToggleGroup
                          type="single"
                          size="sm"
                          value={bridgeType}
                          onValueChange={(value) => {
                            if (!value || value === bridgeType) return;
                            setBridgeType(value as "mayan" | "debridge");
                          }}
                          className="w-full md:w-4/5 mx-auto mt-4 gap-1.5 mb-4 bg-background-gray-light/50"
                        >
                          <ToggleGroupItem
                            value="mayan"
                            aria-label="lend"
                            className={cn(
                              "w-1/2 text-xs gap-1.5 capitalize",
                              bridgeType === "mayan" && "data-[state=on]:bg-background-gray-light"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Image
                                src="/bridges/mayan.png"
                                width={53}
                                height={46}
                                alt="Mayan logo"
                                className="h-3 w-auto"
                              />
                              Mayan
                            </span>
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="debridge"
                            aria-label="borrow"
                            className={cn(
                              "w-1/2 text-xs gap-1.5",
                              bridgeType === "debridge" && "data-[state=on]:bg-background-gray-light"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Image
                                src="/bridges/debridge.png"
                                width={83}
                                height={46}
                                alt="deBridge logo"
                                className="h-3 w-auto"
                              />
                              deBridge
                            </span>
                          </ToggleGroupItem>
                        </ToggleGroup>
                        <div
                          className={cn(
                            "max-w-[420px] mx-auto w-full px-[1.35rem] max-h-[500px] transition-opacity hidden font-aeonik",
                            bridgeType === "mayan" && "block"
                          )}
                          id="swap_widget"
                        />
                        <div className={cn("hidden", bridgeType === "debridge" && "block")}>
                          <Debridge />
                        </div>

                        <Bridge />
                      </TabWrapper>
                    )}
                  </TabsContent>
                  <TabsContent value="points">
                    <div className="flex flex-col items-center pt-8">
                      <p className="font-medium text-4xl flex flex-col justify-center items-center text-center">
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
                          <CopyToClipboard
                            text={`https://www.mfi.gg/refer/${userPointsData.referralLink}`}
                            onCopy={() => {
                              if (userPointsData.referralLink && userPointsData.referralLink.length > 0) {
                                setIsReferralCopied(true);
                                setTimeout(() => setIsReferralCopied(false), 2000);
                              }
                            }}
                          >
                            <Button variant="outline" className="w-full justify-start">
                              {isReferralCopied ? (
                                <div className="text-center w-full">Link copied!</div>
                              ) : (
                                <>
                                  <IconCopy size={16} /> Copy referral code
                                </>
                              )}
                            </Button>
                          </CopyToClipboard>
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

      {web3AuthConncected && <WalletPkDialog pk={web3AuthPk} />}
    </>
  );
};

const TabWrapper = ({ resetWalletState, children }: { resetWalletState: () => void; children: React.ReactNode }) => {
  return (
    <div className="py-4">
      <div className="relative flex flex-col pt-6 gap-2">
        <button
          className="absolute top-0 left-2 flex items-center gap-1 text-sm text-muted-foreground"
          onClick={() => resetWalletState()}
        >
          <IconArrowLeft size={16} /> back
        </button>
        {children}
      </div>
    </div>
  );
};

type TokenOptionsProps = {
  walletAddress: string;
  setState: (state: WalletState) => void;
  setToken?: () => void;
  web3AuthConnected?: boolean;
};

function TokenOptions({ setState, setToken }: TokenOptionsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
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
        <div className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray transition-colors hover:bg-background-gray-hover">
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
        <div className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray transition-colors hover:bg-background-gray-hover">
          <IconRefresh size={20} />
        </div>
        Swap
      </button>
      <button
        className="flex flex-col gap-1 text-sm font-medium items-center"
        onClick={() => {
          setState(WalletState.BRIDGE);
        }}
      >
        <div className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray transition-colors hover:bg-background-gray-hover">
          <IconArrowsExchange size={20} />
        </div>
        Bridge
      </button>
      <button
        className="flex flex-col gap-1 text-sm font-medium items-center"
        onClick={() => {
          setState(WalletState.BUY);
        }}
      >
        <div className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray transition-colors hover:bg-background-gray-hover">
          <IconCreditCardPay size={20} />
        </div>
        Buy
      </button>
    </div>
  );
}

const Debridge = () => {
  const { wallet } = useWallet();
  const divRef = React.useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const [widget, setWidget] = React.useState<any>();
  const isMobile = useIsMobile();

  const loadDeBridgeWidget = React.useCallback(() => {
    console.log("debdrige");
    const widget = window.deBridge.widget({
      v: "1",
      element: "debridgeWidget",
      title: "",
      description: "",
      width: "328",
      height: "",
      r: 16890,
      supportedChains:
        '{"inputChains":{"1":"all","10":"all","56":"all","137":"all","8453":"all","42161":"all","43114":"all","59144":"all","7565164":"all","245022934":"all"},"outputChains":{"7565164":"all"}}',
      inputChain: 1,
      outputChain: 7565164,
      inputCurrency: "ETH",
      outputCurrency: "SOL",
      address: wallet.publicKey.toBase58(),
      showSwapTransfer: true,
      amount: "",
      outputAmount: "",
      isAmountFromNotModifiable: false,
      isAmountToNotModifiable: false,
      lang: "en",
      mode: "deswap",
      isEnableCalldata: false,
      styles:
        "eyJhcHBCYWNrZ3JvdW5kIjoicmdiYSgxOCwyMCwyMiwwKSIsImFwcEFjY2VudEJnIjoicmdiYSgyNTUsMjU1LDI1NSwwKSIsImNoYXJ0QmciOiJyZ2JhKDE4LDIwLDIyLDApIiwiYmFkZ2UiOiIjZGNlODVkIiwiYm9yZGVyUmFkaXVzIjo4LCJmb250RmFtaWx5IjoiIiwicHJpbWFyeUJ0bkJnIjoiI2ZmZmZmZiIsInNlY29uZGFyeUJ0bkJnIjoiI0RDRTg1RCIsImxpZ2h0QnRuQmciOiIiLCJpc05vUGFkZGluZ0Zvcm0iOnRydWUsImJ0blBhZGRpbmciOnsidG9wIjoxMiwicmlnaHQiOm51bGwsImJvdHRvbSI6MTIsImxlZnQiOm51bGx9LCJidG5Gb250U2l6ZSI6bnVsbCwiYnRuRm9udFdlaWdodCI6NDAwfQ==",
      theme: "dark",
      isHideLogo: false,
      logo: "",
    });

    setWidget(widget);
  }, [isMobile, wallet.publicKey]);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (widget) {
      widget.then((widget: any) => {
        widget.on("order", (event: any, params: any) => {
          console.log("order params", params);
        });

        widget.on("singleChainSwap", (event: any, params: any) => {
          console.log("singleChainSwap params", params);
        });
      });
    }
  }, [widget]);

  React.useEffect(() => {
    if (window.deBridge && isMounted && !(divRef.current && divRef.current.innerHTML)) {
      loadDeBridgeWidget();
    }
  }, [isMounted, loadDeBridgeWidget]);

  return (
    <div
      id="debridgeWidget"
      className={cn("max-w-[420px] mx-auto w-full px-[1.35rem] max-h-[500px] transition-opacity font-aeonik")}
    ></div>
  );
};

export { Wallet, Debridge };
