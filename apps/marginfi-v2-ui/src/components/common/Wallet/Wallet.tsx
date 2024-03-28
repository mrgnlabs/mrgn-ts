import React from "react";

import Image from "next/image";

import { useRouter } from "next/router";

import { CopyToClipboard } from "react-copy-to-clipboard";
import { PublicKey } from "@solana/web3.js";
import {
  shortenAddress,
  usdFormatter,
  numeralFormatter,
  groupedNumberFormatterDyn,
  WSOL_MINT,
} from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

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
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Sheet, SheetContent, SheetTrigger, SheetFooter } from "~/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
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
  IconWallet,
} from "~/components/ui/icons";

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
  const [walletTokenState, setWalletTokenState] = React.useState<WalletState>(WalletState.DEFAULT);
  const [activeToken, setActiveToken] = React.useState<Token | null>(null);
  const [amountRaw, setAmountRaw] = React.useState("");

  const address = React.useMemo(() => {
    if (!wallet?.publicKey) return "";
    return shortenAddress(wallet?.publicKey?.toString());
  }, [wallet?.publicKey]);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const activeBank = React.useMemo(() => {
    if (!activeToken) return null;
    return extendedBankInfos.find((bank) => bank.address === activeToken.address);
  }, [activeToken, extendedBankInfos]);

  const maxAmount = React.useMemo(() => {
    if (!activeBank) return 0;
    return activeBank.info.state.mint.equals(WSOL_MINT)
      ? activeBank.userInfo.tokenAccount.balance + nativeSolBalance
      : activeBank.userInfo.tokenAccount.balance;
  }, [activeBank, nativeSolBalance]);

  const resetWalletState = React.useCallback(() => {
    setWalletTokenState(WalletState.DEFAULT);
    setActiveToken(null);
    setAmountRaw("");
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
      shortAddress: address,
      balanceUSD: usdFormatter.format(totalBalance),
      tokens: (userTokens || []) as Token[],
    });

    setIsFetchingWalletData(false);
  }, [wallet?.publicKey, address, extendedBankInfos, nativeSolBalance, isFetchingWalletData]);

  const formatAmount = React.useCallback(
    (newAmount: string, bank: ExtendedBankInfo) => {
      let formattedAmount: string, amount: number;
      // Remove commas from the formatted string
      const newAmountWithoutCommas = newAmount.replace(/,/g, "");
      let decimalPart = newAmountWithoutCommas.split(".")[1];
      const mintDecimals = bank?.info.state.mintDecimals ?? 9;

      if (
        (newAmount.endsWith(",") || newAmount.endsWith(".")) &&
        !newAmount.substring(0, newAmount.length - 1).includes(".")
      ) {
        amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
        formattedAmount = numberFormater.format(amount).concat(".");
      } else {
        const isDecimalPartInvalid = isNaN(Number.parseFloat(decimalPart));
        if (!isDecimalPartInvalid) decimalPart = decimalPart.substring(0, mintDecimals);
        decimalPart = isDecimalPartInvalid
          ? ""
          : ".".concat(Number.parseFloat("1".concat(decimalPart)).toString().substring(1));
        amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
        formattedAmount = numberFormater.format(amount).split(".")[0].concat(decimalPart);
      }

      if (amount > maxAmount) {
        return numberFormater.format(maxAmount);
      } else {
        return formattedAmount;
      }
    },
    [numberFormater, maxAmount]
  );

  const handleInputChange = React.useCallback(
    (newAmount: string) => {
      if (!activeBank) return;
      setAmountRaw(formatAmount(newAmount, activeBank));
    },
    [setAmountRaw, activeBank, formatAmount]
  );

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
                    onClick={() => resetWalletState()}
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
                  {walletTokenState === WalletState.DEFAULT && (
                    <div className="space-y-6 py-8">
                      <h2 className="text-4xl font-medium text-center">{walletData.balanceUSD}</h2>
                      <TokenOptions walletAddress={walletData.address} setState={setWalletTokenState} />
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
                        <div className="space-y-6 mt-6">
                          <TokenOptions
                            walletAddress={walletData.address}
                            setState={setWalletTokenState}
                            setToken={() => {
                              setActiveToken(activeToken);
                            }}
                          />
                          <div className="space-y-3 mx-auto w-3/4">
                            <ActionBoxDialog requestedToken={activeToken.address} requestedAction={ActionType.Deposit}>
                              <Button className="w-full" variant="outline">
                                Deposit
                              </Button>
                            </ActionBoxDialog>
                            <ActionBoxDialog requestedToken={activeToken.address} requestedAction={ActionType.Borrow}>
                              <Button className="w-full" variant="outline">
                                Borrow
                              </Button>
                            </ActionBoxDialog>
                          </div>
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
                          <div className="gap-6 text-center flex flex-col items-center">
                            <div className="gap-2 text-center flex flex-col items-center">
                              <Image
                                src={getTokenImageURL(activeToken.symbol)}
                                alt={activeToken.symbol}
                                width={60}
                                height={60}
                                className="rounded-full"
                              />
                              <div className="space-y-0">
                                <h2 className="font-medium text-xl">Send {activeToken.symbol}</h2>
                              </div>
                            </div>
                            <form className="w-4/5 flex flex-col gap-6">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 justify-end text-sm">
                                  <IconWallet size={16} />
                                  {activeToken.value < 0.01
                                    ? "< 0.01"
                                    : numeralFormatter(activeToken.value) + " " + activeToken.symbol}
                                  <button
                                    className={cn(
                                      "text-chartreuse border-b border-transparent transition-colors",
                                      maxAmount > 0 && "cursor-pointer hover:border-chartreuse"
                                    )}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setAmountRaw(numberFormater.format(maxAmount));
                                    }}
                                    disabled={maxAmount === 0}
                                  >
                                    MAX
                                  </button>
                                </div>
                                <div className="flex flex-col gap-3">
                                  <Label htmlFor="sendAmount" className="relative">
                                    <Input
                                      type="text"
                                      id="sendAmount"
                                      required
                                      placeholder="Amount"
                                      value={amountRaw}
                                      onChange={(e) => handleInputChange(e.target.value)}
                                    />
                                  </Label>
                                  <Label htmlFor="toAddress">
                                    <Input
                                      type="text"
                                      id="sendToAddress"
                                      required
                                      placeholder="Recipient's Solana address"
                                    />
                                  </Label>
                                </div>
                              </div>
                              <div className="flex gap-2 w-full">
                                <Button type="submit" className="w-full">
                                  Send
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="w-full"
                                  onClick={() => {
                                    setWalletTokenState(WalletState.TOKEN);
                                    setAmountRaw("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </div>
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

type TokenOptionsProps = {
  walletAddress: string;
  setState: (state: WalletState) => void;
  setToken?: () => void;
};

function TokenOptions({ walletAddress, setState, setToken }: TokenOptionsProps) {
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
      <button className="flex flex-col gap-1 text-sm font-medium items-center">
        <div className="rounded-full flex items-center justify-center h-12 w-12 bg-background-gray">
          <IconRefresh size={20} />
        </div>
        Swap
      </button>
    </div>
  );
}
