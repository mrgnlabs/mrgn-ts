import React from "react";
import Image from "next/image";
import Link from "next/link";
import { minidenticon } from "minidenticons";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { shortenAddress, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";

export const WalletPopover = () => {
  const { connection } = useConnection();
  const { wallet, connected, logout } = useWalletContext();
  const [walletData, setWalletData] = React.useState({
    address: "",
    shortAddress: "",
    balance: 0,
    formattedBalance: "0.00",
  });

  const address = React.useMemo(() => {
    if (!wallet?.publicKey) return "";
    return shortenAddress(wallet?.publicKey?.toString());
  }, [wallet?.publicKey]);

  const svgURI = React.useMemo(() => {
    return "data:image/svg+xml;utf8," + encodeURIComponent(minidenticon(address));
  }, [connected, address]);

  const getWalletData = React.useCallback(async () => {
    if (!connection || !wallet?.publicKey) return;
    const balance = await connection.getBalance(wallet?.publicKey);
    setWalletData({
      address: wallet?.publicKey.toString(),
      shortAddress: address,
      balance: balance / LAMPORTS_PER_SOL,
      formattedBalance: numeralFormatter(balance / LAMPORTS_PER_SOL),
    });
  }, [connection, wallet?.publicKey, address]);

  React.useEffect(() => {
    getWalletData();
  }, [connected, wallet?.publicKey]);

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex items-center justify-center rounded-full w-12 h-12 p-0 bg-muted/50 hover:bg-muted">
          <Image src={svgURI} alt={shortenAddress(address)} width={40} height={40} />
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={7}>
        {!walletData && <p>Loading...</p>}
        {walletData && (
          <>
            <h1>
              <Link href={`https://solscan.io/address/${walletData.address}`} target="_blank" rel="noreferrer">
                {walletData.shortAddress}
              </Link>
            </h1>
            <h2>
              <span className="text-3xl font-medium">{walletData.formattedBalance}</span> SOL
            </h2>
            <Button onClick={() => logout()} variant="link" className="p-0">
              Logout
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
