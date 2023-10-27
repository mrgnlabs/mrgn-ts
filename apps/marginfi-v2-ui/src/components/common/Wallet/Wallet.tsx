import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { LAMPORTS_PER_SOL, GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { shortenAddress, usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { useMrgnlendStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { WalletAvatar } from "~/components/common/Wallet";
import { Sheet, SheetContent, SheetTrigger, SheetFooter } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { ChevronDownIcon } from "~/components/ui/icons";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

type token = {
  name: string;
  symbol: string;
  image: string;
  value: number;
  valueUSD: number;
  formattedValue: string;
  formattedValueUSD?: string;
};

export const Wallet = () => {
  const router = useRouter();
  const [sortedBanks] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  const { connection } = useConnection();
  const { wallet, connected, logout } = useWalletContext();
  const { isOpenWallet, setIsOpenWallet, pfp, exportPrivateKey } = useWeb3AuthWallet();
  const [isTokensOpen, setIsTokensOpen] = React.useState(false);
  const [walletData, setWalletData] = React.useState<{
    address: string;
    shortAddress: string;
    balanceSOL: string;
    balanceUSD: string;
    tokens: token[];
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
      tokens: (tokens || []) as token[],
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
            return sortedBanks.find((bank) => bank.info.rawBank.mint === parsedAccountInfo["parsed"]["info"]["mint"]);
          })
          .map((account) => {
            const parsedAccountInfo: any = account.account.data;
            const matchedBank = sortedBanks.find(
              (bank) => bank.info.rawBank.mint === parsedAccountInfo["parsed"]["info"]["mint"]
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
    [connection]
  );

  React.useEffect(() => {
    getWalletData();
  }, [connected, wallet?.publicKey]);

  return (
    <Sheet open={isOpenWallet} onOpenChange={(open) => setIsOpenWallet(open)}>
      <SheetTrigger asChild>
        {walletData && (
          <button className="flex items-center gap-2 hover:bg-muted transition-colors rounded-full py-0.5 px-2 text-base text-muted-foreground">
            <WalletAvatar pfp={pfp} address={walletData.address} size="sm" />
            {walletData.shortAddress}
            <ChevronDownIcon size="16" />
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
              {walletData.tokens.length > 0 && (
                <div className="w-full mt-8 space-y-1">
                  <h3 className="font-medium text-sm">Tokens</h3>
                  <Popover open={isTokensOpen} onOpenChange={setIsTokensOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isTokensOpen}
                        className="w-full justify-start"
                      >
                        {walletData.tokens[0].image && (
                          <img
                            src={walletData.tokens[0].image}
                            alt={walletData.tokens[0].symbol}
                            className="w-4 h-4 mr-1"
                          />
                        )}
                        <span className="mr-1">{walletData.tokens[0].symbol}</span>
                        <div className="text-xs space-x-2">
                          <span>{walletData.tokens[0].formattedValue}</span>
                          <span className="text-xs font-light">({walletData.tokens[0].formattedValueUSD})</span>
                        </div>
                        <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[304px] m-0">
                      <Command>
                        <CommandInput placeholder="Search tokens..." className="h-9" />
                        <CommandEmpty>No token found.</CommandEmpty>
                        <CommandGroup>
                          {walletData.tokens.slice(1).map((token, index) => (
                            <CommandItem key={index} className="flex items-center justify-start font-medium pl-3">
                              {token.image && <img src={token.image} alt={token.symbol} className="w-4 h-4 mr-3" />}
                              <span className="mr-2">{token.symbol}</span>
                              <div className="text-xs space-x-2">
                                <span>{token.formattedValue}</span>
                                <span>({token.formattedValueUSD})</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              <ul className="mt-8 w-full space-y-2">
                <li>
                  <Button onClick={() => linkTo("/onramp")} variant="outline" className="p-0 w-full">
                    Buy crypto
                  </Button>
                </li>
                <li>
                  <Button onClick={() => linkTo("/bridge")} variant="outline" className="p-0 w-full">
                    Bridge assets
                  </Button>
                </li>
                <li>
                  <Button onClick={() => linkTo("/swap")} variant="outline" className="p-0 w-full">
                    Swap tokens
                  </Button>
                </li>
                <li>
                  <Button onClick={() => linkTo("/stake")} variant="outline" className="p-0 w-full">
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
                  <li>
                    <Button
                      onClick={() => exportPrivateKey()}
                      variant="link"
                      size="sm"
                      className="p-0 w-full opacity-50"
                    >
                      Export private key
                    </Button>
                  </li>
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
