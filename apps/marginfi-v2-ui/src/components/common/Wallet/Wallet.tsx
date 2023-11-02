import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { LAMPORTS_PER_SOL, GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { shortenAddress, usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useMrgnlendStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { WalletAvatar, WalletTokens, Token } from "~/components/common/Wallet";
import { Sheet, SheetContent, SheetTrigger, SheetFooter } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { IconCheck, IconChevronDown, IconBridge, IconTokenSwap, IconSteak, IconCoins } from "~/components/ui/icons";

export const Wallet = () => {
  const router = useRouter();
  const [sortedBanks] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  const { connection } = useConnection();
  const { wallet, connected, logout } = useWalletContext();
  const { isOpenWallet, setIsOpenWallet, pfp, privateKey } = useWeb3AuthWallet();
  const [isPrivateKeyCopied, setIsPrivateKeyCopied] = React.useState(false);
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

  const solBank = React.useMemo(() => {
    if (!sortedBanks) return undefined;
    return sortedBanks.find((bank) => bank.address.toString() === "CCKtUs6Cgwo4aaQUmBPmyoApH2gUDErxNZCAntD6LYGh");
  }, [sortedBanks]);

  const address = React.useMemo(() => {
    if (!wallet?.publicKey) return "";
    return shortenAddress(wallet?.publicKey?.toString());
  }, [wallet?.publicKey]);

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
      formattedValueUSD: usdFormatter.format(balance / LAMPORTS_PER_SOL),
    });

    const totalBalance = tokens.reduce((acc, token) => acc + (token?.valueUSD || 0), 0);

    setWalletData({
      address: wallet?.publicKey.toString(),
      shortAddress: address,
      balanceUSD: usdFormatter.format(totalBalance),
      balanceSOL: solBank ? numeralFormatter(totalBalance / solBank?.info.state.price) : "0.00",
      tokens: (tokens || []) as Token[],
    });
  }, [connection, wallet?.publicKey, address, solBank]);

  const linkTo = React.useCallback(
    (href: string) => {
      router.push(href);
      setIsOpenWallet(false);
    },
    [router.isReady]
  );

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

  const privateKeyCopied = React.useCallback(() => {
    setIsPrivateKeyCopied(true);
    setTimeout(() => {
      setIsPrivateKeyCopied(false);
    }, 2000);
  }, []);

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
    <Sheet open={isOpenWallet} onOpenChange={(open) => setIsOpenWallet(open)}>
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
              <h1 className="font-medium">
                <Link href={`https://solscan.io/address/${walletData.address}`} target="_blank" rel="noreferrer">
                  {walletData.shortAddress}
                </Link>
              </h1>
            </header>
            <div className="flex flex-col items-center h-full">
              <div className="text-center">
                <h2 className="text-3xl font-medium">{walletData.balanceUSD}</h2>
                <p className="text-muted-foreground text-sm">~{walletData.balanceSOL} SOL</p>
              </div>
              <WalletTokens tokens={walletData.tokens} />
              <ul className="mt-8 w-full space-y-2">
                <li>
                  <Button onClick={() => linkTo("/onramp")} variant="outline" className="w-full">
                    <IconCoins size={14} />
                    Buy crypto
                  </Button>
                </li>
                <li>
                  <Button onClick={() => linkTo("/bridge")} variant="outline" className="w-full">
                    <IconBridge size={14} />
                    Bridge assets
                  </Button>
                </li>
                <li>
                  <Button onClick={() => linkTo("/swap")} variant="outline" className="w-full">
                    <IconTokenSwap size={14} />
                    Swap tokens
                  </Button>
                </li>
                <li>
                  <Button onClick={() => linkTo("/stake")} variant="outline" className="w-full">
                    <IconSteak size={14} />
                    Stake for $LST
                  </Button>
                </li>
              </ul>
              <SheetFooter className="mt-auto">
                <ul>
                  <li>
                    <Button onClick={() => logout()} variant="link" size="sm" className="p-0 w-full opacity-50">
                      Logout
                    </Button>
                  </li>
                  {privateKey && (
                    <li>
                      <CopyToClipboard text={privateKey} onCopy={() => privateKeyCopied()}>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 w-full opacity-50 gap-1"
                          disabled={isPrivateKeyCopied}
                        >
                          {isPrivateKeyCopied ? (
                            <>
                              Copied to clipboard <IconCheck />
                            </>
                          ) : (
                            "Export private key"
                          )}
                        </Button>
                      </CopyToClipboard>
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
  );
};
