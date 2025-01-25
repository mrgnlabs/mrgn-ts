import React from "react";

import { ActionBox as ActionBoxV2 } from "@mrgnlabs/mrgn-ui";
import { PublicKey } from "@solana/web3.js";
import { capture } from "@mrgnlabs/mrgn-utils";

import { useMrgnlendStore } from "~/store";
import { WalletToken } from "~/types";

import { PageHeading } from "~/components/common/PageHeading";
import { Loader } from "~/components/ui/loader";
import { useWallet } from "~/components/wallet-v2";

export default function DepositSwapPage() {
  const [initialized, extendedBankInfosWithoutStakedAssets] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfosWithoutStakedAssets,
  ]);
  const { connected, wallet } = useWallet();
  const [walletTokens, setWalletTokens] = React.useState<WalletToken[] | null>(null);

  React.useEffect(() => {
    const fetchWalletTokens = async (wallet: PublicKey) => {
      console.log("fetching wallet tokens", wallet.toBase58());
      const response = await fetch(`/api/user/wallet?wallet=${wallet.toBase58()}`);
      const data = await response.json();
      setWalletTokens(data);

      console.log("Users wallet tokens", data);
    };

    // walletTokens is null on load and set to empty array when fetching
    if (!connected || !wallet || walletTokens !== null) return;
    fetchWalletTokens(wallet.publicKey);
    setWalletTokens([]);
  }, [connected, wallet, walletTokens]);

  return (
    <>
      {!initialized && <Loader label="Loading marginfi..." className="mt-16" />}

      {initialized && (
        <div className="w-full max-w-7xl mx-auto mb-20 px-5">
          <PageHeading heading="✨ Deposit Swap" body={<p>Swap any token and deposit in your chosen collateral.</p>} />
          <ActionBoxV2.DepositSwap
            useProvider={true}
            depositSwapProps={{
              banks: extendedBankInfosWithoutStakedAssets,
              connected: connected,
              requestedDepositBank: undefined,
              requestedSwapBank: undefined,
              captureEvent: (event, properties) => {
                capture(event, properties);
              },
            }}
          />
        </div>
      )}
    </>
  );
}
