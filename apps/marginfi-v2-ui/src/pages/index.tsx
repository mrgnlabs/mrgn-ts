import React from "react";

import dynamic from "next/dynamic";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { shortenAddress } from "@mrgnlabs/mrgn-common";

import config from "~/config/marginfi";
import { Desktop, Mobile } from "~/mediaQueries";
import { useMrgnlendStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";

import { Banner } from "~/components/desktop/Banner";
import { OverlaySpinner } from "~/components/desktop/OverlaySpinner";
import { PageHeader } from "~/components/common/PageHeader";

import { IconAlertTriangle } from "~/components/ui/icons";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "~/components/ui/select";

const DesktopAccountSummary = dynamic(
  async () => (await import("~/components/desktop/DesktopAccountSummary")).DesktopAccountSummary,
  {
    ssr: false,
  }
);
const AssetsList = dynamic(async () => (await import("~/components/desktop/AssetsList")).AssetsList, { ssr: false });

const UserPositions = dynamic(async () => (await import("~/components/desktop/UserPositions")).UserPositions, {
  ssr: false,
});

const MobileAssetsList = dynamic(async () => (await import("~/components/mobile/MobileAssetsList")).MobileAssetsList, {
  ssr: false,
});

const Home = () => {
  const { walletAddress, wallet, isOverride } = useWalletContext();
  const { connection } = useConnection();
  const debounceId = React.useRef<NodeJS.Timeout | null>(null);
  const [fetchMrgnlendState, setIsRefreshingStore, marginfiAccounts, selectedAccount] = useMrgnlendStore((state) => [
    state.fetchMrgnlendState,
    state.setIsRefreshingStore,
    state.marginfiAccounts,
    state.selectedAccount,
  ]);

  const [isStoreInitialized, isRefreshingStore] = useMrgnlendStore((state) => [
    state.initialized,
    state.isRefreshingStore,
  ]);

  React.useEffect(() => {
    const fetchData = () => {
      setIsRefreshingStore(true);
      fetchMrgnlendState({ marginfiConfig: config.mfiConfig, connection, wallet, isOverride }).catch(console.error);
    };

    if (debounceId.current) {
      clearTimeout(debounceId.current);
    }

    debounceId.current = setTimeout(() => {
      fetchData();

      const id = setInterval(() => {
        setIsRefreshingStore(true);
        fetchMrgnlendState().catch(console.error);
      }, 30_000);

      return () => {
        clearInterval(id);
        clearTimeout(debounceId.current!);
      };
    }, 1000);

    return () => {
      if (debounceId.current) {
        clearTimeout(debounceId.current);
      }
    };
  }, [wallet, isOverride]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ crucial to omit both `connection` and `fetchMrgnlendState` from the dependency array
  // TODO: fix...

  return (
    <>
      <Desktop>
        <PageHeader>lend</PageHeader>
        <div className="flex flex-col h-full justify-start content-start pt-[16px] w-4/5 max-w-7xl gap-4">
          {walletAddress && selectedAccount && isOverride && (
            <Banner
              text={`Read-only view of ${selectedAccount.address.toBase58()} (owner: ${shortenAddress(
                walletAddress
              )}) - All actions are simulated`}
              backgroundColor="#DCE85D"
            />
          )}
          {walletAddress && selectedAccount && marginfiAccounts.length > 1 && (
            <MultipleAccountsBanner
              selectedAccount={selectedAccount}
              marginfiAccounts={marginfiAccounts}
              fetchMrgnlendState={fetchMrgnlendState}
              isRefreshing={isRefreshingStore}
              setIsRefreshing={setIsRefreshingStore}
            />
          )}
          <DesktopAccountSummary />
        </div>
        <div className="pt-[16px] pb-[64px] grid w-4/5 max-w-7xl gap-4 grid-cols-1 xl:grid-cols-2">
          <AssetsList />
          {walletAddress && <UserPositions />}
        </div>
        <OverlaySpinner fetching={!isStoreInitialized || isRefreshingStore} />
      </Desktop>

      <Mobile>
        <PageHeader>lend</PageHeader>
        <div className="flex flex-col w-full h-full justify-start content-start pt-4 px-4 gap-4 mb-20">
          <MobileAssetsList />
        </div>
      </Mobile>
    </>
  );
};

export default Home;

const MultipleAccountsBanner = ({
  selectedAccount,
  marginfiAccounts,
  fetchMrgnlendState,
  isRefreshing,
  setIsRefreshing,
}: {
  selectedAccount: MarginfiAccountWrapper;
  marginfiAccounts: MarginfiAccountWrapper[];
  fetchMrgnlendState: any;
  isRefreshing: boolean;
  setIsRefreshing: (isRefreshingStore: boolean) => void;
}) => {
  const shortAddress = React.useMemo(
    () => shortenAddress(selectedAccount.address.toBase58()),
    [selectedAccount.address]
  );

  return (
    <div className="bg-muted text-white/80 py-4 px-5 rounded-sm w-full flex">
      <div className="w-full flex flex-col gap-2">
        <div className="w-full flex gap-2 items-center">
          <IconAlertTriangle className="text-[#FF0]/80" size={16} />
          <h2 className="font-medium">
            Multiple accounts found <span className="font-light text-sm ml-1">(support coming soon)</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-normal">Select account:</p>
          <Select
            value={selectedAccount.address.toBase58()}
            disabled={isRefreshing}
            onValueChange={(value) => {
              setIsRefreshing(true);
              localStorage.setItem("mfiAccount", value);
              fetchMrgnlendState();
            }}
          >
            <SelectTrigger className="w-[180px]">{isRefreshing ? "Loading..." : shortAddress}</SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Accounts</SelectLabel>
                {marginfiAccounts.map((account, index) => (
                  <SelectItem key={index} value={account.address.toBase58()}>
                    {account.address.toBase58()}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
