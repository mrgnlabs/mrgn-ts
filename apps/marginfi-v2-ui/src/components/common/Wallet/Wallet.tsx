import React from "react";

import Image from "next/image";

import { useRouter } from "next/router";

import { CopyToClipboard } from "react-copy-to-clipboard";
import { shortenAddress, usdFormatter, numeralFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";

import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useIsMobile } from "~/hooks/useIsMobile";
import { showErrorToast } from "~/utils/toastUtils";
import { getTokenImageURL, cn } from "~/utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import {
  WalletAvatar,
  WalletSettings,
  WalletTokens,
  Token,
  WalletOnramp,
  WalletPkDialog,
  WalletIntroDialog,
} from "~/components/common/Wallet";

import { Sheet, SheetContent, SheetTrigger, SheetFooter } from "~/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import {
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconStarFilled,
  IconLogout,
  IconArrowDown,
  IconArrowUp,
  IconArrowRight,
  IconRefresh,
  IconBell,
  IconArrowLeft,
} from "~/components/ui/icons";

export const Wallet = () => {
  const router = useRouter();
  const [extendedBankInfos, nativeSolBalance, initialized] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.initialized,
  ]);
  const [isWalletOpen, setIsWalletOpen] = useUiStore((state) => [state.isWalletOpen, state.setIsWalletOpen]);
  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData, state.fetchPoints]);

  const { wallet, logout, pfp, requestPrivateKey, web3AuthPk, web3AuthConncected } = useWalletContext();
  const isMobile = useIsMobile();

  const [isFetchingWalletData, setIsFetchingWalletData] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [isWalletAddressCopied, setisWalletAddressCopied] = React.useState(false);
  const [walletData, setWalletData] = React.useState<{
    address: string;
    shortAddress: string;
    balanceUSD: string;
    tokens: Token[];
  }>({
    address: "",
    shortAddress: "",
    balanceUSD: "",
    tokens: [],
  });
  const [activeToken, setActiveToken] = React.useState<Token | null>(null);

  const address = React.useMemo(() => {
    if (!wallet?.publicKey) return "";
    return shortenAddress(wallet?.publicKey?.toString());
  }, [wallet?.publicKey]);

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
      shortAddress: address,
      balanceUSD: usdFormatter.format(totalBalance),
      tokens: (userTokens || []) as Token[],
    });

    setIsFetchingWalletData(false);
  }, [wallet?.publicKey, address, extendedBankInfos, nativeSolBalance, isFetchingWalletData]);

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
                <CopyToClipboard
                  text={walletData.address}
                  onCopy={() => {
                    setisWalletAddressCopied(true);
                    setTimeout(() => {
                      setisWalletAddressCopied(false);
                    }, 2000);
                  }}
                >
                  <Button variant="secondary" size="sm" className="text-sm mx-auto">
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
                <div className="absolute right-2 flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <IconBell size={18} />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <IconLogout size={18} />
                  </Button>
                </div>
              </header>
              <Tabs defaultValue="tokens" className="py-8">
                <TabsList className="flex items-center gap-4 bg-transparent px-16 mx-auto">
                  <TabsTrigger
                    value="tokens"
                    className="group w-1/3 bg-transparent data-[state=active]:bg-transparent"
                    onClick={() => setActiveToken(null)}
                  >
                    <span className="group-data-[state=active]:bg-background-gray-light hover:bg-background-gray-light/75 py-1.5 px-3 rounded-md">
                      Tokens
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="points" className="group w-1/3 bg-transparent data-[state=active]:bg-transparent">
                    <span className="group-data-[state=active]:bg-background-gray-light hover:bg-background-gray-light/75 py-1.5 px-3 rounded-md">
                      Points
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="notifications"
                    className="group w-1/3 bg-transparent data-[state=active]:bg-transparent"
                    disabled
                  >
                    <span className="group-data-[state=active]:bg-background-gray-light hover:bg-background-gray-light/75 py-1.5 px-3 rounded-md">
                      Activity
                    </span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="tokens">
                  <div className={cn("space-y-6 py-8", activeToken && "hidden")}>
                    <h2 className="text-4xl font-medium text-center">{walletData.balanceUSD}</h2>
                    <TokenOptions address={walletData.address} />
                    <WalletTokens tokens={walletData.tokens} onTokenClick={(token) => setActiveToken(token)} />
                  </div>

                  <div className={cn("py-4", !activeToken && "hidden")}>
                    {activeToken && (
                      <div className="relative flex flex-col pt-6 gap-2">
                        <button
                          className="absolute top-0 left-12 flex items-center gap-1 text-sm text-muted-foreground"
                          onClick={() => setActiveToken(null)}
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
                        <div className="space-y-6 mt-6">
                          <TokenOptions address={walletData.address} />
                          <div className="space-y-2 mx-auto w-3/4">
                            <Button className="w-full">Deposit</Button>
                            <Button className="w-full">Borrow</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="points">Points</TabsContent>
              </Tabs>
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
        </>
      )}
    </>
  );
};

function TokenOptions({ address }: { address: string }) {
  const [isWalletAddressCopied, setIsWalletAddressCopied] = React.useState(false);
  return (
    <div className="flex items-center justify-center gap-4">
      <CopyToClipboard
        text={address}
        onCopy={() => {
          setIsWalletAddressCopied(true);
          setTimeout(() => {
            setIsWalletAddressCopied(false);
          }, 2000);
        }}
      >
        <div className="flex flex-col gap-1 text-sm font-medium text-center">
          {!isWalletAddressCopied ? (
            <>
              <button className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray">
                <IconArrowDown size={20} />
              </button>
              Receive
            </>
          ) : (
            <>
              <button className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray">
                <IconCheck size={20} />
              </button>
              Copied!
            </>
          )}
        </div>
      </CopyToClipboard>
      <div className="flex flex-col gap-1 text-sm font-medium text-center">
        <button className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray">
          <IconArrowUp size={20} />
        </button>
        Send
      </div>
      <div className="flex flex-col gap-1 text-sm font-medium text-center">
        <button className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray">
          <IconRefresh size={20} />
        </button>
        Swap
      </div>
    </div>
  );
}
