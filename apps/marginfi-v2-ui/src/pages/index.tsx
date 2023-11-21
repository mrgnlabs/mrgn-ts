import React from "react";
import dynamic from "next/dynamic";

import { shortenAddress } from "@mrgnlabs/mrgn-common";

import config from "~/config/marginfi";
import { useMrgnlendStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Banner } from "~/components/desktop/Banner";
import { PageHeader } from "~/components/common/PageHeader";
import { OverlaySpinner } from "~/components/desktop/OverlaySpinner";
import { Desktop, Mobile } from "~/mediaQueries";

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
  const [fetchMrgnlendState, setIsRefreshingStore, marginfiAccountCount, selectedAccount] = useMrgnlendStore(
    (state) => [state.fetchMrgnlendState, state.setIsRefreshingStore, state.marginfiAccountCount, state.selectedAccount]
  );

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
          {walletAddress && marginfiAccountCount > 1 && (
            <Banner text="Multiple accounts were found (not supported). Contact the team or use at own risk." />
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
