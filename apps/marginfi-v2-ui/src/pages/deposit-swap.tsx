import React from "react";

import { ActionBox as ActionBoxV2 } from "@mrgnlabs/mrgn-ui";
import { PublicKey } from "@solana/web3.js";
import { capture } from "@mrgnlabs/mrgn-utils";

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
    updateWalletToken,
    marginfiClient,
  ] = useMrgnlendStore((state) => [
    state.walletTokens,
    state.initialized,
    state.extendedBankInfosWithoutStakedAssets,
    state.fetchWalletTokens,
    state.extendedBankInfos,
    state.updateWalletToken,
    state.marginfiClient,
  ]);
  const { connected, wallet } = useWallet();

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
              walletTokens: walletTokens,
              captureEvent: (event, properties) => {
                capture(event, properties);
              },
              onComplete(previousTxn) {
                const connection = marginfiClient?.provider.connection;
                console.log("previousTxn", previousTxn);
                if (
                  previousTxn.txnType === "DEPOSIT_SWAP" &&
                  previousTxn.depositSwapOptions.walletToken &&
                  connection
                ) {
                  console.log("updating wallet token");
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
