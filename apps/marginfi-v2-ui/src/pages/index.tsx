import React from "react";

import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { capture, Desktop, Mobile } from "@mrgnlabs/mrgn-utils";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionBox } from "@mrgnlabs/mrgn-ui";

import { useMrgnlendStore, useUiStore } from "~/store";
import { useActionBoxStore } from "~/hooks/useActionBoxStore";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

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
import { IconBackpackWallet, IconBook, IconTrophy, IconYBX } from "~/components/ui/icons";
import { Loader } from "~/components/ui/loader";

const AssetsList = dynamic(async () => (await import("~/components/desktop/AssetList")).AssetsList, {
  ssr: false,
});

export default function HomePage() {
  const router = useRouter();
  const { walletContextState, walletAddress, isOverride, connected } = useWallet();
  const [previousTxn, setIsWalletOpen, setIsWalletAuthDialogOpen, setPreviousTxn, setIsActionComplete] = useUiStore(
    (state) => [
      state.previousTxn,
      state.setIsWalletOpen,
      state.setIsWalletAuthDialogOpen,
      state.setPreviousTxn,
      state.setIsActionComplete,
    ]
  );
  const [
    marginfiClient,
    isStoreInitialized,
    isRefreshingStore,
    selectedAccount,
    extendedBankInfos,
    accountSummary,
    nativeSolBalance,
  ] = useMrgnlendStore((state) => [
    state.marginfiClient,
    state.initialized,
    state.isRefreshingStore,
    state.selectedAccount,
    state.extendedBankInfos,
    state.accountSummary,
    state.nativeSolBalance,
  ]);

  const [actionMode, refreshState] = useActionBoxStore()((state) => [state.actionMode, state.refreshState]);
  const [isStateReset, setIsStateReset] = React.useState(false);

  const annoucements = React.useMemo(() => {
    const mother = extendedBankInfos.find((bank) => bank.meta.tokenSymbol === "MOTHER");
    const hSOL = extendedBankInfos.find((bank) => bank.meta.tokenSymbol === "hSOL");

    return [
      { bank: mother },
      { bank: hSOL },
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
  }, [extendedBankInfos, router]);

  // reset actionbox state (except for deposit / borrow)
  // this allows for linking to lend page with action mode preset
  React.useEffect(() => {
    if (actionMode !== ActionType.Deposit && actionMode !== ActionType.Borrow && !isStateReset) {
      refreshState();
      setIsStateReset(true);
    }
  }, [actionMode, refreshState, isStateReset]);

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
                    banks: extendedBankInfos,
                    connected: connected,
                    walletContextState: walletContextState,
                    onComplete: (previousTxn) => {
                      // TODO refactor previousTxn to be more like tradingui
                      if (previousTxn.txnType !== "LEND") return;
                      setIsActionComplete(true);

                      setPreviousTxn({
                        type: previousTxn.lendingOptions.type,
                        bank: previousTxn.lendingOptions.bank,
                        amount: previousTxn.lendingOptions.amount,
                        txn: previousTxn.txn,
                      });
                    },
                    captureEvent: (event, properties) => {
                      capture(event, properties);
                    },
                    onConnect: () => setIsWalletAuthDialogOpen(true),
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
                  banks: extendedBankInfos,
                  connected: connected,
                  walletContextState: walletContextState,
                  onComplete: (previousTxn) => {
                    // TODO refactor previousTxn to be more like tradingui
                    if (previousTxn.txnType !== "LEND") return;
                    setIsActionComplete(true);

                    setPreviousTxn({
                      type: previousTxn.lendingOptions.type,
                      bank: previousTxn.lendingOptions.bank,
                      amount: previousTxn.lendingOptions.amount,
                      txn: previousTxn.txn,
                    });
                  },
                  captureEvent: (event, properties) => {
                    capture(event, properties);
                  },
                  onConnect: () => setIsWalletAuthDialogOpen(true),
                }}
              />
            </div>
            <div className="mb-24" />
          </>
        )}
      </Mobile>

      {isStoreInitialized && previousTxn && <ActionComplete />}
    </>
  );
}
