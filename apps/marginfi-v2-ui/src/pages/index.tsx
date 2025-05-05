import React from "react";

import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { capture, Desktop, LendingModes, Mobile } from "@mrgnlabs/mrgn-utils";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";

import { useMrgnlendStore, useUiStore } from "~/store";

import { Banner } from "~/components/desktop/Banner";
import {
  Announcements,
  AnnouncementCustomItem,
  AnnouncementBankItem,
  AnnouncementsDialog,
} from "~/components/common/Announcements";

import { OverlaySpinner } from "~/components/ui/overlay-spinner";
import { Loader } from "~/components/ui/loader";

const AssetsList = dynamic(async () => (await import("~/components/desktop/AssetList")).AssetsList, {
  ssr: false,
});

export default function HomePage() {
  const router = useRouter();
  const { walletContextState, walletAddress, isOverride, connected } = useWallet();
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);

  const [
    isStoreInitialized,
    isRefreshingStore,
    selectedAccount,
    extendedBankInfos,
    fetchMrgnlendState,
    marginfiClient,
    stakeAccounts,
  ] = useMrgnlendStore((state) => [
    state.initialized,
    state.isRefreshingStore,
    state.selectedAccount,
    state.extendedBankInfos,
    state.fetchMrgnlendState,
    state.marginfiClient,
    state.stakeAccounts,
  ]);

  const annoucements = React.useMemo(() => {
    let banks: (ExtendedBankInfo | undefined)[] = [];

    if (marginfiClient?.banks) {
      const latestBankKeys = Array.from(marginfiClient.banks.keys()).splice(0, 3);
      banks.push(
        ...latestBankKeys
          .map((bankKey) => extendedBankInfos.find((bank) => bank.address.toBase58() === bankKey))
          .filter((bank): bank is ExtendedBankInfo => bank !== undefined)
      );
    }

    banks = banks.filter((bank): bank is ExtendedBankInfo => bank !== undefined);
    return [
      ...banks.map((bank) => ({
        bank: bank,
      })),
    ] as (AnnouncementBankItem | AnnouncementCustomItem)[];
  }, [extendedBankInfos, marginfiClient]);

  return (
    <>
      <Desktop>
        {!isStoreInitialized && <Loader label="Loading marginfi..." className="mt-16" />}
        {isStoreInitialized && (
          <>
            <div className="flex flex-col h-full justify-start content-start w-full xl:w-4/5 xl:max-w-7xl gap-4">
              {walletAddress && selectedAccount && isOverride && (
                <Banner
                  text={`Read-only view of ${selectedAccount.address.toBase58()} (owner: ${shortenAddress(
                    walletAddress
                  )}) - All actions are simulated`}
                  backgroundColor="#DCE85D"
                />
              )}
              <Announcements items={annoucements} />
              <AnnouncementsDialog />
              <div className="p-4 space-y-4 w-full">
                <ActionBox.BorrowLend
                  useProvider={true}
                  lendProps={{
                    requestedLendType: lendingMode === LendingModes.LEND ? ActionType.Deposit : ActionType.Borrow,
                    connected,
                    walletContextState,
                    stakeAccounts,
                    captureEvent: (event, properties) => {
                      capture(event, properties);
                    },
                    onComplete: () => {
                      fetchMrgnlendState();
                    },
                  }}
                />
              </div>
            </div>
            <div className="pt-[16px] pb-[64px] px-4 w-full xl:w-4/5 xl:max-w-7xl mt-8 gap-4">
              <AssetsList />
            </div>
          </>
        )}
        <OverlaySpinner fetching={!isStoreInitialized || isRefreshingStore} />
      </Desktop>

      <Mobile>
        {!isStoreInitialized && <Loader label="Loading mrgnlend..." className="mt-16" />}
        {isStoreInitialized && (
          <>
            <Announcements items={annoucements} />
            <AnnouncementsDialog />
            <div className="p-4 space-y-4 w-full">
              <ActionBox.BorrowLend
                useProvider={true}
                lendProps={{
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
            <div className="mb-24" />
          </>
        )}
      </Mobile>
    </>
  );
}
