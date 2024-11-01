import React from "react";

import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { capture, Desktop, LendingModes, Mobile } from "@mrgnlabs/mrgn-utils";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionBox } from "@mrgnlabs/mrgn-ui";

import { useMrgnlendStore, useUiStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { IconBook } from "@tabler/icons-react";

import { Banner } from "~/components/desktop/Banner";
import {
  Announcements,
  AnnouncementCustomItem,
  AnnouncementBankItem,
  AnnouncementsDialog,
} from "~/components/common/Announcements";

import { OverlaySpinner } from "~/components/ui/overlay-spinner";
import { IconBackpackWallet } from "~/components/ui/icons";
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
  ] = useMrgnlendStore((state) => [
    state.initialized,
    state.isRefreshingStore,
    state.selectedAccount,
    state.extendedBankInfos,
    state.fetchMrgnlendState,
    state.marginfiClient,
  ]);

  const annoucements = React.useMemo(() => {
    let banks: (ExtendedBankInfo | undefined)[] = [];

    if (marginfiClient?.banks) {
      const latestBankKeys = Array.from(marginfiClient.banks.keys()).splice(0, 2);
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
      {
        image: <IconBook size={22} />,
        text: "New documentation now available!",
        onClick: () => window.open("https://docs.marginfi.com/"),
      },
      {
        image: <IconBackpackWallet size={22} />,
        text: "5% points boost for Backpack users!",
        onClick: () => router.push("/points"),
      },
    ] as (AnnouncementBankItem | AnnouncementCustomItem)[];
  }, [extendedBankInfos, router, marginfiClient]);

  return (
    <>
      <Desktop>
        {!isStoreInitialized && <Loader label="Loading mrgnlend..." className="mt-16" />}
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
                    connected: connected,
                    walletContextState: walletContextState,
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
