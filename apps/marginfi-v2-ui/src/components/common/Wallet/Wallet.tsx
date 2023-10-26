import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { shortenAddress, usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";

import { useMrgnlendStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { WalletAvatar } from "~/components/common/Wallet";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { ChevronDownIcon } from "~/components/ui/icons";

export const Wallet = () => {
  const router = useRouter();
  const [sortedBanks] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  const { connection } = useConnection();
  const { wallet, connected, logout } = useWalletContext();
  const { isOpenWallet, setIsOpenWallet, exportPrivateKey } = useWeb3AuthWallet();
  const [walletData, setWalletData] = React.useState({
    address: "",
    shortAddress: "",
    balance: "",
    formattedBalance: "0.00",
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
    setWalletData({
      address: wallet?.publicKey.toString(),
      shortAddress: address,
      balance: numeralFormatter(balance / LAMPORTS_PER_SOL),
      formattedBalance: usdFormatter.format(solBank ? (balance / LAMPORTS_PER_SOL) * solBank.info.state.price : 0),
    });
  }, [connection, wallet?.publicKey, address, solBank]);

  const linkTo = React.useCallback(
    (href: string) => {
      router.push(href);
      setIsOpenWallet(false);
    },
    [router.isReady]
  );

  React.useEffect(() => {
    getWalletData();
  }, [connected, wallet?.publicKey]);

  return (
    <Sheet open={isOpenWallet} onOpenChange={(open) => setIsOpenWallet(open)}>
      <SheetTrigger asChild>
        {walletData && (
          <button className="flex items-center gap-2 hover:bg-muted transition-colors rounded-full px-2 text-base text-muted-foreground">
            <WalletAvatar address={walletData.address} size="sm" />
            {walletData.shortAddress}
            <ChevronDownIcon size="16" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent>
        {walletData ? (
          <div className="pt-4 px-4">
            <header className="space-y-2 flex flex-col items-center mb-8">
              <WalletAvatar address={walletData.address} size="lg" />
              <h1 className="font-medium">
                <Link href={`https://solscan.io/address/${walletData.address}`} target="_blank" rel="noreferrer">
                  {walletData.shortAddress}
                </Link>
              </h1>
            </header>
            <div className="flex flex-col items-center">
              <div className="text-center">
                <h2 className="text-3xl font-medium">{walletData.formattedBalance}</h2>
                <p className="text-muted-foreground text-sm">~{walletData.balance} SOL</p>
              </div>
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
              <ul className="mt-8">
                <li>
                  <Button onClick={() => logout()} variant="link" size="sm" className="p-0 w-full opacity-50">
                    Logout
                  </Button>
                </li>
                <li>
                  <Button onClick={() => exportPrivateKey()} variant="link" size="sm" className="p-0 w-full opacity-50">
                    Export private key
                  </Button>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </SheetContent>
    </Sheet>
  );
};
