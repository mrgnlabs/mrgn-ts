import React from "react";
import Image from "next/image";
import { useRouter } from "next/router";

import { CopyToClipboard } from "react-copy-to-clipboard";
import { Connection } from "@solana/web3.js";
import {
  IconChevronDown,
  IconCopy,
  IconLogout,
  IconArrowUp,
  IconRefresh,
  IconArrowLeft,
  IconTrophy,
  IconKey,
  IconX,
  IconArrowsExchange,
  IconCreditCardPay,
  IconInfoCircleFilled,
  IconArrowDown,
} from "@tabler/icons-react";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, UserPointsData, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress, usdFormatter, numeralFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { useIsMobile, cn } from "@mrgnlabs/mrgn-utils";

import { useWalletStore } from "~/components/wallet-v2/store/wallet.store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import {
  WalletButton,
  WalletAvatar,
  WalletTokens,
  Token as TokenType,
  WalletOnramp,
  WalletPkDialog,
  WalletSend,
  WalletReceive,
  WalletAuthAccounts,
} from "~/components/wallet-v2/components";
import { Swap } from "~/components/swap";
import { Mayan, Debridge } from "~/components/bridge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "~/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

type WalletProps = {
  connection: Connection;
  initialized: boolean;
  mfiClient?: MarginfiClient | null;
  marginfiAccounts?: MarginfiAccountWrapper[];
  selectedAccount?: MarginfiAccountWrapper | null;
  extendedBankInfos: ExtendedBankInfo[];
  nativeSolBalance: number;
  userPointsData?: UserPointsData;
  accountSummary?: AccountSummary;
  refreshState: () => void;
  headerComponent?: JSX.Element;
};

enum WalletState {
  DEFAULT = "default",
  TOKEN = "token",
  SEND = "send",
  RECEIVE = "receive",
  SELECT = "select",
  SWAP = "swap",
  BUY = "bug",
  BRIDGE = "bridge",
  POINTS = "points",
  NOTIS = "notis",
}

const Wallet = ({
  connection,
  initialized,
  mfiClient,
  marginfiAccounts,
  selectedAccount,
  extendedBankInfos,
  nativeSolBalance,
  userPointsData,
  accountSummary,
  refreshState,
  headerComponent,
}: WalletProps) => {
  const router = useRouter();
  const [isWalletOpen, setIsWalletOpen] = useWalletStore((state) => [state.isWalletOpen, state.setIsWalletOpen]);
  const { wallet, connected, logout, pfp, requestPrivateKey, web3AuthPk, web3AuthConncected, isLoading } = useWallet();
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
  const [isReferralCopied, setIsReferralCopied] = React.useState(false);
  const [bridgeType, setBridgeType] = React.useState<"mayan" | "debridge">("mayan");
  const [isWalletBalanceErrorShown, setIsWalletBalanceErrorShown] = React.useState(false);
  const prevIsWalletOpenRef = React.useRef(isWalletOpen);

  const isMobile = useIsMobile();

  const activeBank = React.useMemo(() => {
    if (!activeToken) return null;
    return extendedBankInfos.find((bank) => bank.address.equals(activeToken.address));
  }, [activeToken, extendedBankInfos]);

  const getUserTokens = React.useCallback(() => {
    if (isNaN(nativeSolBalance) || !extendedBankInfos) return [];
    const prioritizedSymbols = ["SOL", "LST"];

    const userBanks = extendedBankInfos.filter(
      (bank) => bank.userInfo.tokenAccount.balance !== 0 || bank.meta.tokenSymbol === "SOL"
    );

    return userBanks
      .map((bank) => {
        const isSolBank = bank.meta.tokenSymbol === "SOL";
        let value = isSolBank
          ? nativeSolBalance + bank.userInfo.tokenAccount.balance
          : bank.userInfo.tokenAccount.balance;
        let valueUSD =
          (isSolBank ? nativeSolBalance + bank.userInfo.tokenAccount.balance : bank.userInfo.tokenAccount.balance) *
          bank.info.state.price;

        if (Number.isNaN(value) || Number.isNaN(valueUSD)) {
          value = 0;
          valueUSD = 0;
        }

        return {
          address: bank.address,
          name: isSolBank ? "Solana" : bank.meta.tokenName,
          image: bank.meta.tokenLogoUri,
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
  }, [extendedBankInfos, nativeSolBalance]);

  const resetWalletState = React.useCallback(() => {
    setWalletTokenState(WalletState.DEFAULT);
    setActiveToken(null);
  }, []);

  const getWalletData = React.useCallback(async () => {
    if (!wallet?.publicKey) return;
    const userTokens = getUserTokens();

    if (!userTokens) return;

    const totalBalance = userTokens.reduce(
      (acc, token) => acc + (typeof token.valueUSD === "number" ? token.valueUSD : 0),
      0
    );

    setWalletData({
      address: wallet?.publicKey.toString(),
      shortAddress: shortenAddress(wallet?.publicKey.toString()),
      balanceUSD: usdFormatter.format(totalBalance),
      tokens: (userTokens || []) as TokenType[],
    });
  }, [wallet?.publicKey, getUserTokens]);

  React.useEffect(() => {
    getWalletData();
  }, [getWalletData]);

  React.useEffect(() => {
    if (isWalletOpen && isWalletOpen !== prevIsWalletOpenRef.current) {
      getWalletData();
    }
    prevIsWalletOpenRef.current = isWalletOpen;
  }, [isWalletOpen, getWalletData]);

  return (
    <>
      {!isLoading && !connected && <WalletButton />}

      {!isLoading && connected && (
        <Sheet open={isWalletOpen} onOpenChange={(open) => setIsWalletOpen(open)}>
          <SheetTrigger asChild>
            {wallet?.publicKey && (
              <button className="flex items-center gap-2 hover:bg-accent/50 transition-colors rounded-full py-0.5 pr-2 pl-1 text-sm text-muted-foreground">
                <WalletAvatar pfp={pfp} address={wallet?.publicKey.toBase58()} size="sm" />
                {shortenAddress(wallet?.publicKey)}
                <IconChevronDown size={16} />
              </button>
            )}
          </SheetTrigger>
          <SheetContent className="outline-none z-[50] px-4 bg-background border-0 pt-2">
            <SheetHeader className="sr-only">
              <SheetTitle>marginfi wallet</SheetTitle>
              <SheetDescription>Manage your marginfi wallet.</SheetDescription>
            </SheetHeader>
            {walletData.address ? (
              <div className="max-h-full">
                <header className="flex items-center gap-2 h-12">
                  <WalletAvatar pfp={pfp} address={walletData.address} size="md" className="absolute left-2" />

                  {!headerComponent && mfiClient && marginfiAccounts && selectedAccount && (
                    <div className="mx-auto">
                      <WalletAuthAccounts
                        initialized={initialized}
                        mfiClient={mfiClient}
                        connection={connection}
                        marginfiAccounts={marginfiAccounts}
                        selectedAccount={selectedAccount}
                        fetchMrgnlendState={refreshState}
                      />
                    </div>
                  )}

                  {headerComponent && headerComponent}

                  <div className="absolute right-2 flex items-center md:gap-1">
                    {web3AuthConncected && (
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
                    )}

                    <Button variant="ghost" size="icon" onClick={logout} className="shrink-0">
                      <IconLogout size={18} className="translate-x-0.5" />
                    </Button>

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
                <Tabs defaultValue="tokens" className="py-8">
                  {walletTokenState === WalletState.DEFAULT && (
                    <TabsList className="flex items-center gap-4 bg-transparent px-16 mx-auto">
                      <TabsTrigger
                        value="tokens"
                        className="group w-1/3 bg-transparent data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                        onClick={() => resetWalletState()}
                      >
                        <span className="group-data-[state=active]:bg-accent hover:bg-accent py-1.5 px-3 rounded-md">
                          Tokens
                        </span>
                      </TabsTrigger>
                      {userPointsData && (
                        <TabsTrigger
                          value="points"
                          className="group w-1/3 bg-transparent data-[state=active]:bg-transparent"
                        >
                          <span className="group-data-[state=active]:bg-background-gray-light hover:bg-background-gray-light/75 py-1.5 px-3 rounded-md">
                            Points
                          </span>
                        </TabsTrigger>
                      )}
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
                  )}
                  <TabsContent value="tokens">
                    {walletTokenState === WalletState.DEFAULT && (
                      <div className="py-8">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <h2 className="text-4xl font-medium">{walletData.balanceUSD}</h2>
                          <p className="flex items-center gap-1 text-muted-foreground text-sm">
                            Available to deposit
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <IconInfoCircleFilled size={14} />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Available balance of tokens supported as collateral on marginfi.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </p>
                          {accountSummary && (
                            <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
                              Portfolio balance
                              <span className="flex items-center gap-1 text-primary">
                                <strong className="font-medium">{usdFormatter.format(accountSummary.balance)}</strong>{" "}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <IconInfoCircleFilled className="text-muted-foreground" size={14} />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Your current marginfi portfolio balance.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="mt-8 space-y-6">
                          <TokenOptions setState={setWalletTokenState} />

                          <WalletTokens
                            className="h-[calc(100vh-325px)] pb-16"
                            tokens={walletData.tokens}
                            onTokenClick={(token) => {
                              setActiveToken(token);
                              setWalletTokenState(WalletState.TOKEN);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {walletTokenState === WalletState.TOKEN && activeToken && (
                      <TabWrapper resetWalletState={resetWalletState}>
                        <div className="gap-2 text-center flex flex-col items-center">
                          <Image
                            src={activeToken.image}
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
                            connection={connection}
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
                              setWalletTokenState(WalletState.DEFAULT);
                              setActiveToken(null);
                            }}
                            onComplete={() => {
                              refreshState();
                            }}
                          />
                        )}
                      </TabWrapper>
                    )}
                    {walletTokenState === WalletState.RECEIVE && (
                      <TabWrapper resetWalletState={resetWalletState}>
                        <WalletReceive address={walletData.address} />
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
                          className="h-[calc(100vh-210px)] mt-8"
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
                        <Swap initialInputMint={activeBank?.info.state.mint} />
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
                          className="w-full md:w-4/5 mx-auto mt-4 gap-1.5 mb-4 bg-accent px-1"
                        >
                          <ToggleGroupItem
                            value="mayan"
                            aria-label="lend"
                            className={cn(
                              "w-1/2 text-xs gap-1.5 capitalize",
                              bridgeType === "mayan" && "data-[state=on]:bg-background"
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
                              bridgeType === "debridge" && "data-[state=on]:bg-background"
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

                        <div className={cn("hidden", bridgeType === "mayan" && "block")}>
                          <Mayan />
                        </div>
                      </TabWrapper>
                    )}
                  </TabsContent>
                  {userPointsData && (
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
                              text={`https://app.marginfi.com/refer/${userPointsData.referralLink}`}
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
                  )}
                </Tabs>
              </div>
            ) : (
              <p>Loading...</p>
            )}
          </SheetContent>
        </Sheet>
      )}

      {web3AuthConncected && <WalletPkDialog pk={web3AuthPk} />}
    </>
  );
};

const TabWrapper = ({ resetWalletState, children }: { resetWalletState: () => void; children: React.ReactNode }) => {
  return (
    <div className="relative flex flex-col pt-6 gap-2">
      <button
        className="absolute top-0 left-2 flex items-center gap-1 text-sm text-muted-foreground"
        onClick={() => resetWalletState()}
      >
        <IconArrowLeft size={16} /> back
      </button>
      {children}
    </div>
  );
};

type TokenOptionsProps = {
  setState: (state: WalletState) => void;
  setToken?: () => void;
};

function TokenOptions({ setState, setToken }: TokenOptionsProps) {
  const items = [
    {
      label: "Send",
      icon: IconArrowUp,
      state: WalletState.SEND,
      onClick: () => {
        if (!setToken && !setToken) {
          setState(WalletState.SELECT);
          return;
        }

        if (setToken) setToken();
        setState(WalletState.SEND);
      },
    },
    {
      label: "Receive",
      icon: IconArrowDown,
      state: WalletState.RECEIVE,
      onClick: () => {
        setState(WalletState.RECEIVE);
      },
    },
    {
      label: "Swap",
      icon: IconRefresh,
      state: WalletState.SWAP,
      onClick: () => {
        setState(WalletState.SWAP);
      },
    },
    {
      label: "Bridge",
      icon: IconArrowsExchange,
      state: WalletState.BRIDGE,
      onClick: () => {
        setState(WalletState.BRIDGE);
      },
    },
    {
      label: "Buy",
      icon: IconCreditCardPay,
      state: WalletState.BUY,
      onClick: () => {
        setState(WalletState.BUY);
      },
    },
  ];
  return (
    <div className="flex items-center justify-center gap-4 text-xs">
      {items.map((item) => (
        <button key={item.state} className="flex flex-col gap-1 font-medium items-center" onClick={item.onClick}>
          <div className="rounded-full flex items-center justify-center h-10 w-10 bg-accent/50 transition-colors hover:bg-accent">
            <item.icon size={20} />
          </div>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export { Wallet };
