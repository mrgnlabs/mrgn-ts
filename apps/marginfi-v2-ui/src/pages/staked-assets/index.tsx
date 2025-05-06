import React from "react";

import Link from "next/link";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes } from "@mrgnlabs/mrgn-utils";
import { ActionBox } from "@mrgnlabs/mrgn-ui";
import { useWallet } from "@mrgnlabs/mrgn-ui";

import { useMrgnlendStore, useUiStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";

import { Button } from "~/components/ui/button";

export default function StakedAssetsPage() {
  const { walletContextState, connected } = useWallet();
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);
  const [fetchMrgnlendState, stakedAssetBankInfos, stakeAccounts] = useMrgnlendStore((state) => [
    state.fetchMrgnlendState,
    state.stakedAssetBankInfos,
    state.stakeAccounts,
  ]);

  return (
    <div className="flex flex-col justify-center items-center px-4 max-w-7xl mx-auto w-full">
      <PageHeading
        heading="Staked Asset Banks"
        body={
          <p>
            Deposit your native stake and use it as collateral.{" "}
            <Link
              href="https://docs.marginfi.com/staked-collateral"
              className="border-b border-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              Learn more.
            </Link>
          </p>
        }
      />

      <div className="w-full">
        <ActionBox.Lend
          useProvider={true}
          lendProps={{
            banks: stakedAssetBankInfos,
            requestedLendType: lendingMode === LendingModes.LEND ? ActionType.Deposit : ActionType.Borrow,
            connected: connected,
            walletContextState: walletContextState,
            stakeAccounts,
            onComplete: () => {
              fetchMrgnlendState();
            },
          }}
        />
      </div>

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
