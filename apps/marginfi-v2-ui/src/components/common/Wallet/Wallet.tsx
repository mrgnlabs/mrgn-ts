import React, { useEffect } from "react";

import { CopyToClipboard } from "react-copy-to-clipboard";

import { shortenAddress, usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";

import { useMrgnlendStore, useUiStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import {
  WalletAvatar,
  WalletTokens,
  Token,
  WalletOnramp,
  WalletPkDialog,
  WalletIntroDialog,
} from "~/components/common/Wallet";

import { Sheet, SheetContent, SheetTrigger, SheetFooter } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { IconCheck, IconChevronDown, IconCopy } from "~/components/ui/icons";

export const Wallet = () => {
  const [extendedBankInfos, nativeSolBalance, initialized] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.initialized,
  ]);
  const [isWalletOpen, setIsWalletOpen] = useUiStore((state) => [state.isWalletOpen, state.setIsWalletOpen]);

  const { connection } = useConnection();
  const { wallet, connected, logout, pfp, requestPrivateKey, web3AuthPk, web3AuthConncected } = useWalletContext();
  const isMobile = useIsMobile();

  const [isWalletAddressCopied, setIsWalletAddressCopied] = React.useState(false);
  const [isFundingWalletAddressCopied, setIsFundingWalletAddressCopied] = React.useState(false);
  const [walletData, setWalletData] = React.useState<{
    address: string;
    shortAddress: string;
    balanceSOL: string;
    balanceUSD: string;
    tokens: Token[];
  }>({
    address: "",
    shortAddress: "",
    balanceSOL: "",
    balanceUSD: "",
    tokens: [],
  });

  useEffect(() => {
    if (walletData && walletData.address && walletData.tokens.length === 0 && initialized) highlightMoonPay();
  }, [walletData, initialized]);

  const highlightMoonPay = () => {
    if (!document) return;
    const moonpayButton = document.querySelector(`#moonpay-btn`);
    const walletSheetItems = document.querySelectorAll(".wallet-sheet-item");
    if (!moonpayButton) return;

    walletSheetItems.forEach((item) => item.classList.add("opacity-30"));
    moonpayButton.classList.remove("opacity-30");
    moonpayButton.classList.add("animate-pulse");

    setTimeout(() => {
      walletSheetItems.forEach((item) => item.classList.remove("opacity-30"));
      moonpayButton.classList.remove("opacity-30", "animate-pulse");
    }, 2500);
  };

  const address = React.useMemo(() => {
    if (!wallet?.publicKey) return "";
    return shortenAddress(wallet?.publicKey?.toString());
  }, [wallet?.publicKey]);

  // fetch wallet data and store in state
  // address, sol balance, token balances
  const getWalletData = React.useCallback(async () => {
    if (!connection || !wallet?.publicKey || !extendedBankInfos || isNaN(nativeSolBalance)) return;

    const userBanks = extendedBankInfos.filter(
      (bank) => bank.userInfo.tokenAccount.balance !== 0 || bank.meta.tokenSymbol === "SOL"
    );

    const prioritizedSymbols = ["SOL"];

    const solBank = userBanks.find(
      (bank) => bank.address.toString() === "CCKtUs6Cgwo4aaQUmBPmyoApH2gUDErxNZCAntD6LYGh"
    );

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

    const totalBalance = userTokens.reduce((acc, token) => acc + (token?.valueUSD || 0), 0);

    setWalletData({
      address: wallet?.publicKey.toString(),
      shortAddress: address,
      balanceUSD: usdFormatter.format(totalBalance),
      balanceSOL: solBank ? numeralFormatter(totalBalance / solBank?.info.state.price) : "0.00",
      tokens: (userTokens || []) as Token[],
    });
  }, [connection, wallet?.publicKey, address, extendedBankInfos, nativeSolBalance]);

  // fetch wallet data on mount and every 20 seconds
  React.useEffect(() => {
    getWalletData();
    const intervalId = setInterval(() => {
      getWalletData();
    }, 20000);

    return () => {
      clearInterval(intervalId);
    };
  }, [connected, wallet?.publicKey, extendedBankInfos, getWalletData]);

  return (
    <>
      <Sheet open={isWalletOpen} onOpenChange={(open) => setIsWalletOpen(open)}>
        <SheetTrigger asChild>
          {walletData && initialized && (
            <button className="flex items-center gap-2 hover:bg-muted transition-colors rounded-full py-0.5 pr-2 pl-1 text-sm text-muted-foreground">
              <WalletAvatar pfp={pfp} address={walletData.address} size="sm" />
              {walletData.shortAddress}
              <IconChevronDown size={16} />
            </button>
          )}
        </SheetTrigger>
        <SheetContent className="outline-none z-[1000001]">
          {walletData ? (
            <div className="pt-4 px-4 h-full flex flex-col">
              <header className="space-y-2 flex flex-col items-center mb-8 wallet-sheet-item">
                <WalletAvatar pfp={pfp} address={walletData.address} size="lg" />
                <CopyToClipboard
                  text={walletData.address}
                  onCopy={() => {
                    setIsWalletAddressCopied(true);
                    setTimeout(() => {
                      setIsWalletAddressCopied(false);
                    }, 2000);
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <button className="flex items-center gap-1 cursor-pointe outline-none">
                      {isWalletAddressCopied && <>copied!</>}
                      {!isWalletAddressCopied && <>{walletData.shortAddress}</>}
                    </button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="flex items-center gap-1 cursor-pointe outline-none">
                            {isWalletAddressCopied && (
                              <>
                                <IconCheck size={14} />
                              </>
                            )}
                            {!isWalletAddressCopied && (
                              <>
                                <IconCopy size={14} />
                              </>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Click to copy</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CopyToClipboard>
              </header>
              <div className="flex flex-col items-center h-full">
                <div className="text-center wallet-sheet-item">
                  <h2 className="text-3xl font-medium">{walletData.balanceUSD}</h2>
                  <p className="text-muted-foreground text-sm">~{walletData.balanceSOL} SOL</p>
                </div>
                <div className="wallet-sheet-item">
                  <WalletTokens tokens={walletData.tokens} />
                </div>
                <div className="pt-8">
                  <div className="text-sm text-white/50 text-center mb-4 wallet-sheet-item">
                    Transfer funds to your marginfi wallet
                    <CopyToClipboard
                      text={walletData.address}
                      onCopy={() => {
                        setIsFundingWalletAddressCopied(true);
                        setTimeout(() => {
                          setIsFundingWalletAddressCopied(false);
                        }, 2000);
                      }}
                    >
                      <div className="inline-flex items-center gap-1 mr-1">
                        <button className="flex items-center gap-1 cursor-pointe outline-none">
                          {walletData.shortAddress}
                        </button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="flex items-center gap-1 cursor-pointe outline-none">
                                {isFundingWalletAddressCopied && (
                                  <>
                                    <IconCheck size={14} />
                                  </>
                                )}
                                {!isFundingWalletAddressCopied && (
                                  <>
                                    <IconCopy size={14} />
                                  </>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Click to copy</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CopyToClipboard>
                    or buy directly with MoonPay.
                  </div>
                  <WalletOnramp />
                </div>
                <SheetFooter className="text-red-400 mt-auto w-full">
                  <ul className="space-y-3 mb-4 md:space-y-0 md:mb-0">
                    <li>
                      <Button
                        onClick={() => logout()}
                        variant={isMobile ? "outline" : "link"}
                        size="sm"
                        className="p-0 w-full opacity-50"
                      >
                        Logout
                      </Button>
                    </li>
                    {web3AuthConncected && (
                      <li>
                        <Button
                          variant={isMobile ? "outline" : "link"}
                          size="sm"
                          className="p-0 w-full opacity-50 gap-1"
                          onClick={() => {
                            localStorage.setItem("mrgnPrivateKeyRequested", "true");
                            requestPrivateKey();
                          }}
                        >
                          Export private key
                        </Button>
                      </li>
                    )}
                  </ul>
                </SheetFooter>
              </div>
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
