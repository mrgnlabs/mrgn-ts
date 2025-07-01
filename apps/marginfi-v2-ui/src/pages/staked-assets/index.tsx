import React from "react";

import Link from "next/link";
import { PublicKey } from "@solana/web3.js";

import { ActionType, useExtendedBanks, useRefreshUserData } from "@mrgnlabs/mrgn-state";
import { LendingModes } from "@mrgnlabs/mrgn-utils";
import { ActionBox } from "@mrgnlabs/mrgn-ui";
import { useWallet } from "@mrgnlabs/mrgn-ui";

import { useUiStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { Button } from "~/components/ui/button";

export default function StakedAssetsPage() {
  const { walletContextState, connected } = useWallet();
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);

  const refreshUserData = useRefreshUserData();
  const { extendedBanks } = useExtendedBanks();
  const stakedAssetBanks = React.useMemo(
    () => extendedBanks.filter((bank) => bank.info.rawBank.config.assetTag === 2),
    [extendedBanks]
  );

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
            banks: stakedAssetBanks,
            requestedLendType: lendingMode === LendingModes.LEND ? ActionType.Deposit : ActionType.Borrow,
            connected: connected,
            walletContextState: walletContextState,
            onComplete: (newAccountKey?: PublicKey) => {
              refreshUserData({ newAccountKey });
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
