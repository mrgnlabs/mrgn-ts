import React from "react";

import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";

import { PageHeading } from "~/components/common/PageHeading";
import { Loader } from "~/components/ui/loader";
import { WalletToken } from "@mrgnlabs/mrgn-common";
import { useExtendedBanks, useMarginfiClient, useRefreshUserData, useWalletTokens } from "@mrgnlabs/mrgn-state";

export default function DepositSwapPage() {
  const { data: walletTokens } = useWalletTokens();
  const { extendedBanks } = useExtendedBanks();
  const { marginfiClient } = useMarginfiClient();
  const refreshUserData = useRefreshUserData();

  const extendedBankInfosWithoutStakedAssets = React.useMemo(
    () => extendedBanks?.filter((bank) => bank.info.rawBank.config.assetTag !== 2),
    [extendedBanks]
  );

  const { connected } = useWallet();

  return (
    <>
      {!extendedBankInfosWithoutStakedAssets && <Loader label="Loading deposit swap..." className="mt-16" />}

      {extendedBankInfosWithoutStakedAssets && (
        <div className="w-full max-w-7xl mx-auto mb-20 px-5">
          <PageHeading heading="Deposit Swap" body={<p>Swap any token and deposit in your chosen collateral.</p>} />
          <ActionBox.DepositSwap
            useProvider={true}
            depositSwapProps={{
              banks: extendedBankInfosWithoutStakedAssets,
              allBanks: extendedBanks,
              connected: connected,
              requestedDepositBank: undefined,
              requestedSwapBank: undefined,
              walletTokens: walletTokens ?? [],
              captureEvent: (event, properties) => {
                capture(event, properties);
              },
              onComplete(infoProps: { walletToken?: WalletToken }) {
                const connection = marginfiClient?.provider.connection;
                if (infoProps.walletToken && connection) {
                  // updateWalletToken(
                  //   infoProps.walletToken.address.toBase58(),
                  //   infoProps.walletToken.ata.toBase58(),
                  //   marginfiClient?.provider.connection
                  // );
                }
                refreshUserData();
              },
            }}
          />
        </div>
      )}
    </>
  );
}
