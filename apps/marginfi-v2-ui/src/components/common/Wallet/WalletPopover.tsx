import React from "react";
import Link from "next/link";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { shortenAddress, usdFormatter } from "@mrgnlabs/mrgn-common";
import { useMrgnlendStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { WalletAvatar } from "~/components/common/Wallet";
import { Button } from "~/components/ui/button";

export const WalletPopover = () => {
  const [sortedBanks] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  const { connection } = useConnection();
  const { wallet, connected, logout } = useWalletContext();
  const { topUpWallet } = useWeb3AuthWallet();
  const [walletData, setWalletData] = React.useState({
    address: "",
    shortAddress: "",
    balance: 0,
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
    if (!connection || !wallet?.publicKey || !solBank) return;
    const balance = await connection.getBalance(wallet?.publicKey);
    setWalletData({
      address: wallet?.publicKey.toString(),
      shortAddress: address,
      balance: balance / LAMPORTS_PER_SOL,
      formattedBalance: usdFormatter.format((balance / LAMPORTS_PER_SOL) * solBank.info.state.price),
    });
  }, [connection, wallet?.publicKey, address, solBank]);

  React.useEffect(() => {
    getWalletData();
  }, [connected, wallet?.publicKey]);

  return (
    <Popover>
      <PopoverTrigger>
        {walletData && <WalletAvatar address={walletData.address} className="hover:bg-muted" />}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="min-w-[360px]">
        {!walletData && <p>Loading...</p>}
        {walletData && (
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
              <h2 className="text-3xl font-medium">{walletData.formattedBalance}</h2>
              <ul className="mt-8 w-full space-y-2">
                <li>
                  <Button onClick={() => topUpWallet()} variant="outline" className="p-0 w-full">
                    Top up wallet
                  </Button>
                </li>
                <li>
                  <Link href="/swap">
                    <Button variant="outline" className="p-0 w-full">
                      Swap tokens
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/stake">
                    <Button variant="outline" className="p-0 w-full">
                      Stake for $LST
                    </Button>
                  </Link>
                </li>
              </ul>
              <Button onClick={() => logout()} variant="link" size="sm" className="p-0 w-full mt-8 opacity-50">
                Logout
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
