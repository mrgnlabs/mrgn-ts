import React from "react";

import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";
import { useConnection } from "~/hooks/use-connection";

import { useMrgnlendStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { Loader } from "~/components/ui/loader";
import { WalletToken } from "@mrgnlabs/mrgn-common";

export default function DepositSwapPage() {
  const [
    walletTokens,
    initialized,
    extendedBankInfosWithoutStakedAssets,
    fetchWalletTokens,
    extendedBankInfos,
    marginfiClient,
    updateWalletTokens,
    updateWalletToken,
    fetchMrgnlendState,
  ] = useMrgnlendStore((state) => [
    state.walletTokens,
    state.initialized,
    state.extendedBankInfosWithoutStakedAssets,
    state.fetchWalletTokens,
    state.extendedBankInfos,
    state.marginfiClient,
    state.updateWalletTokens,
    state.updateWalletToken,
    state.fetchMrgnlendState,
  ]);
  const { connected, wallet } = useWallet();
  const { connection } = useConnection();
  const intervalId = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (
      wallet &&
      extendedBankInfos &&
      extendedBankInfos.length > 0 &&
      (walletTokens === null || walletTokens.length === 0)
    ) {
      fetchWalletTokens(wallet, extendedBankInfos);
    }
  }, [fetchWalletTokens, wallet, walletTokens, extendedBankInfos]);

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
      {!initialized && <Loader label="Loading deposit swap..." className="mt-16" />}

      {initialized && (
        <div className="w-full max-w-7xl mx-auto mb-20 px-5">
          <PageHeading heading="Deposit Swap" body={<p>Swap any token and deposit in your chosen collateral.</p>} />
          <ActionBox.DepositSwap
            useProvider={true}
            depositSwapProps={{
              banks: extendedBankInfosWithoutStakedAssets,
              allBanks: extendedBankInfos,
              connected: connected,
              requestedDepositBank: undefined,
              requestedSwapBank: undefined,
              walletTokens: walletTokens,
              captureEvent: (event, properties) => {
                capture(event, properties);
              },
              onComplete(infoProps: { walletToken?: WalletToken }) {
                const connection = marginfiClient?.provider.connection;
                if (infoProps.walletToken && connection) {
                  updateWalletToken(
                    infoProps.walletToken.address.toBase58(),
                    infoProps.walletToken.ata.toBase58(),
                    marginfiClient?.provider.connection
                  );
                }
                fetchMrgnlendState();
              },
            }}
          />
        </div>
      )}
    </>
  );
}
