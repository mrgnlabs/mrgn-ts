import React from "react";

import Link from "next/link";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes } from "@mrgnlabs/mrgn-utils";
import { ActionBox } from "@mrgnlabs/mrgn-ui";

import { useMrgnlendStore, useUiStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { PageHeading } from "~/components/common/PageHeading";

import { Button } from "~/components/ui/button";

export default function StakedAssetsPage() {
  const { walletContextState, connected } = useWallet();
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);
  const [fetchMrgnlendState, extendedBankInfos] = useMrgnlendStore((state) => [
    state.fetchMrgnlendState,
    state.extendedBankInfos,
  ]);

  return (
    <div className="flex flex-col justify-center items-center px-4">
      <PageHeading heading="Staked Asset Banks" body={<p>Deposit your native stake and use it as collateral.</p>} />

      <ActionBox.Lend
        useProvider={true}
        lendProps={{
          banks: extendedBankInfos.filter((bank) => bank.info.rawBank.config.assetTag === 2),
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
