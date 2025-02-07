import React from "react";

import { ActionBox } from "@mrgnlabs/mrgn-ui";
import { PublicKey } from "@solana/web3.js";
import { capture } from "@mrgnlabs/mrgn-utils";
import { useConnection } from "~/hooks/use-connection";

import { useMrgnlendStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { Loader } from "~/components/ui/loader";
import { useWallet } from "~/components/wallet-v2";

export default function DepositSwapPage() {
  const [
    walletTokens,
    initialized,
    extendedBankInfosWithoutStakedAssets,
    fetchWalletTokens,
    extendedbankInfos,
    marginfiClient,
    updateWalletTokens,
    updateWalletToken,
  ] = useMrgnlendStore((state) => [
    state.walletTokens,
    state.initialized,
    state.extendedBankInfosWithoutStakedAssets,
    state.fetchWalletTokens,
    state.extendedBankInfos,
    state.marginfiClient,
    state.updateWalletTokens,
    state.updateWalletToken,
  ]);
  const { connected, wallet } = useWallet();
  const { connection } = useConnection();
  const intervalId = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (
      wallet &&
      extendedbankInfos &&
      extendedbankInfos.length > 0 &&
      (walletTokens === null || walletTokens.length === 0)
    ) {
      fetchWalletTokens(wallet, extendedbankInfos);
    }
  }, [fetchWalletTokens, wallet, walletTokens, extendedbankInfos]);

  const fetchAndUpdateTokens = React.useCallback(() => {
    if (!wallet || !connection) {
      return;
    }

    if (connection) {
      console.log("🔄 Periodically fetching wallet tokens");
      updateWalletTokens(connection);
    }
  }, [wallet, connection, updateWalletTokens]);

  // Effect for periodic updates
  React.useEffect(() => {
    intervalId.current = setInterval(fetchAndUpdateTokens, 60_000); // Periodic refresh

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    };
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {!initialized && <Loader label="Loading marginfi..." className="mt-16" />}

      {initialized && (
        <div className="w-full max-w-7xl mx-auto mb-20 px-5">
          <PageHeading heading="✨ Deposit Swap" body={<p>Swap any token and deposit in your chosen collateral.</p>} />
          <ActionBox.DepositSwap
            useProvider={true}
            depositSwapProps={{
              banks: extendedBankInfosWithoutStakedAssets,
              connected: connected,
              requestedDepositBank: undefined,
              requestedSwapBank: undefined,
              walletTokens: walletTokens,
              captureEvent: (event, properties) => {
                capture(event, properties);
              },
              onComplete(previousTxn) {
                const connection = marginfiClient?.provider.connection;
                if (
                  previousTxn.txnType === "DEPOSIT_SWAP" &&
                  previousTxn.depositSwapOptions.walletToken &&
                  connection
                ) {
                  updateWalletToken(
                    previousTxn.depositSwapOptions.walletToken.address.toBase58(),
                    previousTxn.depositSwapOptions.walletToken.ata.toBase58(),
                    marginfiClient?.provider.connection
                  );
                }
              },
            }}
          />
        </div>
      )}
    </>
  );
}
