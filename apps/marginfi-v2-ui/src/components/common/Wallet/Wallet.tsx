import React from "react";

import { LAMPORTS_PER_SOL, GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { CopyToClipboard } from "react-copy-to-clipboard";

import { shortenAddress, usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";

import { useMrgnlendStore, useUiStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useIsMobile } from "~/hooks/useIsMobile";
import { useAnalytics } from "~/hooks/useAnalytics";

import { MrgnTooltip } from "~/components/common/MrgnTooltip";
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
  const [sortedBanks] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  const [isWalletOpen, setIsWalletOpen] = useUiStore((state) => [state.isWalletOpen, state.setIsWalletOpen]);

  const { connection } = useConnection();
  const { wallet, connected, logout, pfp, requestPrivateKey, web3AuthPk, web3AuthConncected } = useWalletContext();
  const isMobile = useIsMobile();
  const { setPersonProperties } = useAnalytics();

  const [isWalletAddressCopied, setIsWalletAddressCopied] = React.useState(false);
  const [isFundingAddressCopied, setIsFundingAddressCopied] = React.useState(false);
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

  // filter out SOL bank from sortedBanks
  const solBank = React.useMemo(() => {
    if (!sortedBanks) return undefined;
    return sortedBanks.find((bank) => bank.address.toString() === "CCKtUs6Cgwo4aaQUmBPmyoApH2gUDErxNZCAntD6LYGh");
  }, [sortedBanks]);

  const address = React.useMemo(() => {
    if (!wallet?.publicKey) return "";
    return shortenAddress(wallet?.publicKey?.toString());
  }, [wallet?.publicKey]);

  // fetch wallet data and store in state
  // address, sol balance, token balances
  const getWalletData = React.useCallback(async () => {
    if (!connection || !wallet?.publicKey) return;
    const balance = await connection.getBalance(wallet?.publicKey);
    const tokens = await getSupportedTokens(wallet?.publicKey);

    tokens.splice(0, 0, {
      name: "Solana",
      symbol: "SOL",
      image: solBank?.meta.tokenLogoUri,
      value: balance / LAMPORTS_PER_SOL,
      valueUSD: solBank ? (balance / LAMPORTS_PER_SOL) * solBank.info.state.price : 0,
      formattedValue: numeralFormatter(balance / LAMPORTS_PER_SOL),
      formattedValueUSD: usdFormatter.format(solBank ? (balance / LAMPORTS_PER_SOL) * solBank.info.state.price : 0),
    });

    const totalBalance = tokens.reduce((acc, token) => acc + (token?.valueUSD || 0), 0);

    setWalletData({
      address: wallet?.publicKey.toString(),
      shortAddress: address,
      balanceUSD: usdFormatter.format(totalBalance),
      balanceSOL: solBank ? numeralFormatter(totalBalance / solBank?.info.state.price) : "0.00",
      tokens: (tokens || []) as Token[],
    });

    setPersonProperties({
      walletAddress: wallet?.publicKey.toString(),
      tokens: tokens.map((token) => ({
        name: token?.name,
        symbol: token?.symbol,
        value: token?.value,
      })),
    });
  }, [connection, wallet?.publicKey, address, solBank]);

  // fetch token accounts for wallet
  // and filter out unsupported tokens
  const getSupportedTokens = React.useCallback(
    async (wallet: PublicKey) => {
      try {
        const filters: GetProgramAccountsFilter[] = [
          {
            dataSize: 165,
          },
          {
            memcmp: {
              offset: 32,
              bytes: wallet.toString(),
            },
          },
        ];
        const accounts = await connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, { filters: filters });

        const supportedTokens = accounts
          .filter((account) => {
            const parsedAccountInfo: any = account.account.data;

            return sortedBanks.find((bank) => {
              return bank.info.rawBank.mint.toString() === parsedAccountInfo["parsed"]["info"]["mint"];
            });
          })
          .map((account) => {
            const parsedAccountInfo: any = account.account.data;
            const matchedBank = sortedBanks.find(
              (bank) => bank.info.rawBank.mint.toString() === parsedAccountInfo["parsed"]["info"]["mint"]
            );

            if (!matchedBank || parsedAccountInfo.parsed.info.tokenAmount.uiAmount <= 0) {
              return null;
            }

            const val = parsedAccountInfo.parsed.info.tokenAmount.uiAmount;

            return {
              name: matchedBank?.meta.tokenName,
              image: matchedBank?.meta.tokenLogoUri,
              symbol: matchedBank?.meta.tokenSymbol,
              value: val,
              valueUSD: val * matchedBank.info.state.price,
              formattedValue: val < 0.01 ? `< 0.01` : numeralFormatter(val),
              formattedValueUSD: usdFormatter.format(val * matchedBank.info.state.price),
            };
          })
          .filter((token) => token !== null);

        return supportedTokens;
      } catch (error) {
        console.error("Error fetching token accounts:", error);
        return [];
      }
    },
    [connection, sortedBanks]
  );

  // fetch wallet data on mount and every 20 seconds
  React.useEffect(() => {
    getWalletData();
    const intervalId = setInterval(() => {
      getWalletData();
    }, 20000);

    return () => {
      clearInterval(intervalId);
    };
  }, [connected, wallet?.publicKey, getWalletData]);

  return (
    <>
      <Sheet open={isWalletOpen} onOpenChange={(open) => setIsWalletOpen(open)}>
        <SheetTrigger asChild>
          {walletData && (
            <button className="flex items-center gap-2 hover:bg-muted transition-colors rounded-full py-0.5 pr-2 pl-1 text-sm text-muted-foreground">
              <WalletAvatar pfp={pfp} address={walletData.address} size="sm" />
              {walletData.shortAddress}
              <IconChevronDown size={16} />
            </button>
          )}
        </SheetTrigger>
        <SheetContent className="outline-none">
          {walletData ? (
            <div className="pt-4 px-4 h-full flex flex-col">
              <header className="space-y-2 flex flex-col items-center mb-8">
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
                  <MrgnTooltip title="Click to copy" className="hidden md:block" placement="top">
                    <button className="font-medium flex items-center gap-1 cursor-pointer">
                      {isWalletAddressCopied && (
                        <>
                          copied! <IconCheck size={14} />
                        </>
                      )}
                      {!isWalletAddressCopied && (
                        <>
                          {walletData.shortAddress}
                          <IconCopy size={14} />
                        </>
                      )}
                    </button>
                  </MrgnTooltip>
                </CopyToClipboard>
              </header>
              <div className="flex flex-col items-center h-full">
                <div className="text-center">
                  <h2 className="text-3xl font-medium">{walletData.balanceUSD}</h2>
                  <p className="text-muted-foreground text-sm">~{walletData.balanceSOL} SOL</p>
                </div>
                <WalletTokens tokens={walletData.tokens} />
                <div className="pt-8">
                  <div className="text-sm text-white/50 text-center mb-4">
                    Tranfer funds to your marginfi wallet
                    <CopyToClipboard
                      text={walletData.address}
                      onCopy={() => {
                        setIsFundingAddressCopied(true);
                        setTimeout(() => {
                          setIsFundingAddressCopied(false);
                        }, 2000);
                      }}
                    >
                      <MrgnTooltip title="Click to copy" className="hidden md:block" placement="top">
                        <button className="font-medium inline-flex mx-1 items-center gap-1 cursor-pointer">
                          {isFundingAddressCopied && (
                            <>
                              copied! <IconCheck size={12} />
                            </>
                          )}
                          {!isFundingAddressCopied && (
                            <>
                              {shortenAddress(walletData.address)}
                              <IconCopy size={12} />
                            </>
                          )}
                        </button>
                      </MrgnTooltip>
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
