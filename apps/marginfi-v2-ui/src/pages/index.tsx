import React from "react";

import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import { shortenAddress } from "@mrgnlabs/mrgn-common";

import { Desktop, Mobile } from "~/mediaQueries";
import { useMrgnlendStore, useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";

import { Banner } from "~/components/desktop/Banner";
import { ActionBoxLendWrapper } from "~/components/common/ActionBox";
import { ActionComplete } from "~/components/common/ActionComplete";
import {
  Announcements,
  AnnouncementCustomItem,
  AnnouncementBankItem,
  AnnouncementsDialog,
} from "~/components/common/Announcements";

import { OverlaySpinner } from "~/components/ui/overlay-spinner";
import { IconBackpackWallet, IconTrophy, IconYBX } from "~/components/ui/icons";
import { Loader } from "~/components/ui/loader";

const AssetsList = dynamic(async () => (await import("~/components/desktop/AssetList")).AssetsList, {
  ssr: false,
});

export default function HomePage() {
  const router = useRouter();
  const { walletAddress, isOverride } = useWalletContext();
  const [previousTxn, setIsWalletOpen] = useUiStore((state) => [state.previousTxn, state.setIsWalletOpen]);
  const [isStoreInitialized, isRefreshingStore, selectedAccount, extendedBankInfos] = useMrgnlendStore((state) => [
    state.initialized,
    state.isRefreshingStore,
    state.selectedAccount,
    state.extendedBankInfos,
  ]);

  const annoucements = React.useMemo(() => {
    const tnsr = extendedBankInfos.find((bank) => bank.meta.tokenSymbol === "TNSR");
    return [
      {
        image: (
          <div className="text-chartreuse">
            <IconTrophy size={22} />
          </div>
        ),
        text: "New experience live! Points are in mrgnwallet.",
        onClick: () => {
          setIsWalletOpen(true);
        },
        requireAuth: true,
      },
      {
        image: <IconBackpackWallet size={22} />,
        text: "5% points boost for Backpack users!",
        onClick: () => router.push("/points"),
      },
      {
        image: <IconYBX size={22} />,
        text: "Read the YBX announcement!",
        onClick: () => window.open("https://twitter.com/marginfi/status/1762865889035317679"),
      },
      { bank: tnsr },
    ] as (AnnouncementBankItem | AnnouncementCustomItem)[];
  }, [extendedBankInfos, router, setIsWalletOpen]);

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
              <ActionBoxLendWrapper />
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
            <ActionBoxLendWrapper />
            <div className="mb-24" />
          </>
        )}
      </Mobile>
      {isStoreInitialized && previousTxn && <ActionComplete />}
    </>
  );
}
