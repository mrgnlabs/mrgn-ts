import React from "react";
import { OverlaySpinner } from "~/components/ui/overlay-spinner";
import { Loader } from "~/components/ui/loader";
import { useRouter } from "next/router";
import { useAppStore, useMrgnlendStore, useUiStore } from "~/store";
import { Desktop, Mobile } from "~/mediaQueryUtils";
import { ActionBox } from "~/components";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes, useConnection } from "@mrgnlabs/mrgn-utils";
import dynamic from "next/dynamic";
import { initComputerClient } from "@mrgnlabs/mrgn-common";

const AssetsList = dynamic(async () => (await import("~/components/desktop/AssetList")).AssetsList, {
  ssr: false,
});

export default function HomePage() {
  const router = useRouter();
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);
  const [
    connected,
    getUserMix,
    computerInfo,
    computerAccount,
    getComputerRecipient,
    balanceAddressMap,
    getMixinClient,
  ] = useAppStore((state) => [
    state.connected,
    state.getUserMix,
    state.info,
    state.account,
    state.getComputerRecipient,
    state.balanceAddressMap,
    state.getMixinClient,
  ]);
  const mixinClient = getMixinClient();
  const { connection } = useConnection();

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

  return (
    <>
      <Desktop>
        {!isStoreInitialized && <Loader label="Loading Dome Lend..." className="mt-16" />}
        {isStoreInitialized && (
          <>
            <div className="flex flex-col h-full justify-start content-start w-full xl:w-4/5 xl:max-w-7xl gap-4">
              <div className="p-4 space-y-4 w-full">
                <ActionBox.BorrowLend
                  useProvider={true}
                  lendProps={{
                    requestedLendType: lendingMode === LendingModes.LEND ? ActionType.Deposit : ActionType.Borrow,
                    connected,
                    // walletContextState,
                    // stakeAccounts,
                    captureEvent: (event, properties) => {
                      // capture(event, properties);
                    },
                    onComplete: () => {
                      fetchMrgnlendState();
                    },
                    isMixinLend: true,
                    getUserMix: getUserMix,
                    computerInfo: computerInfo,
                    connection: connection,
                    computerAccount: computerAccount,
                    getComputerRecipient: getComputerRecipient,
                    balanceAddressMap: balanceAddressMap,
                  }}
                />
              </div>
            </div>
            <div className="pt-[16px] pb-[64px] px-4 w-full xl:w-4/5 xl:max-w-7xl mt-8 gap-4">
              <AssetsList />
            </div>
          </>
        )}
      </Desktop>

      <Mobile>
        {!isStoreInitialized && <Loader label="Loading mrgnlend..." className="mt-16" />}
        {isStoreInitialized && (
          <>
            {/* <Announcements items={annoucements} />
            <AnnouncementsDialog /> */}
            <div className="p-4 space-y-4 w-full">
              <ActionBox.BorrowLend
                useProvider={true}
                lendProps={{
                  requestedLendType: lendingMode === LendingModes.LEND ? ActionType.Deposit : ActionType.Borrow,
                  connected: connected,
                  // walletContextState: walletContextState,
                  stakeAccounts,
                  onComplete: () => {
                    fetchMrgnlendState();
                  },
                  isMixinLend: true,
                  // getUserMix: getUserMix,
                  // computerInfo: computerInfo,
                  // connection: connection,
                  // computerAccount: computerAccount,
                  // getComputerRecipient: getComputerRecipient,
                  // balanceAddressMap: balanceAddressMap,
                  // fetchTransaction: mixinClient.utxo.fetchTransaction,
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
