import React from "react";

import Link from "next/link";

import { PublicKey } from "@solana/web3.js";
import { getConfig } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, makeExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes, getStakeAccounts, getAvailableStakedAssetBanks } from "@mrgnlabs/mrgn-utils";
import { ActionBox } from "@mrgnlabs/mrgn-ui";

import { useMrgnlendStore, useUiStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { useConnection } from "~/hooks/use-connection";

import { PageHeading } from "~/components/common/PageHeading";

import { Button } from "~/components/ui/button";

export default function StakedAssetsPage() {
  const { walletContextState, connected, wallet } = useWallet();
  const { connection } = useConnection();
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);
  const [fetchMrgnlendState, marginfiClient] = useMrgnlendStore((state) => [
    state.fetchMrgnlendState,
    state.marginfiClient,
  ]);
  const [isFetching, setIsFetching] = React.useState(false);

  React.useEffect(() => {
    const init = async () => {
      setIsFetching(true);
      const stakeAccounts = await getStakeAccounts(connection, wallet.publicKey, { filterInactive: false });
      console.log("stakeAccounts", stakeAccounts);
      stakeAccounts.forEach((acc) => {
        console.log("validator", acc.validator.toBase58());
        acc.accounts.forEach((a) => {
          console.log("account", a.pubkey.toBase58(), a.amount);
        });
      });

      const availableBanks = await getAvailableStakedAssetBanks(connection, stakeAccounts, marginfiClient?.config);
      console.log("availableBanks", availableBanks);
    };

    if (!wallet || !connection || !connected || !marginfiClient || isFetching) return;
    init();
  }, [wallet, connection, isFetching, connected, marginfiClient]);

  return (
    <div className="flex flex-col justify-center items-center px-4">
      <PageHeading heading="Staked Asset Banks" body={<p>Deposit your native stake and use it as collateral.</p>} />

      <ActionBox.Lend
        useProvider={true}
        lendProps={{
          requestedLendType: lendingMode === LendingModes.LEND ? ActionType.Deposit : ActionType.Borrow,
          connected: connected,
          walletContextState: walletContextState,
          captureEvent: (event, properties) => {
            // capture(event, properties);
          },
          onComplete: () => {
            fetchMrgnlendState();
          },
        }}
      />

      <div className="flex flex-col justify-center items-center mt-16 gap-4">
        <p className="text-sm text-center text-muted-foreground leading-relaxed">
          Don&apos;t see your native stake?
          <br className="hiddensm:block" /> Create a new Staked Asset bank for your validator.
        </p>
        <Link href="/staked-assets/create">
          <Button variant="secondary">Create Staked Asset Bank</Button>
        </Link>
      </div>
    </div>
  );
}
