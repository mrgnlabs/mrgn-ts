import React, { useState } from "react";
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
import { IconAlertTriangleFilled, IconChevronRight } from "@tabler/icons-react";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

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
}: {
  selectedAccount: MarginfiAccountWrapper;
  marginfiAccounts: MarginfiAccountWrapper[];
  fetchMrgnlendState: any;
}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-muted text-white/80 py-4 pl-5 pr-12 rounded-sm w-full relative flex flex-row hover:bg-muted/80">
      <div className="w-full flex flex-col gap-2">
        <div
          className="w-full flex flex-row cursor-pointer items-center"
          onClick={() => setExpanded((current) => !current)}
        >
          <IconAlertTriangleFilled className="text-[#FF0]/80" size={16} />
          <div className="flex gap-6 items-center">
            <div className="mr-auto flex items-start"></div>
            <div className="space-y-2.5">
              <h2 className="font-medium">Multiple accounts were found (support coming soon).</h2>
            </div>
          </div>
        </div>
        {expanded && (
          <div className="pl-5">
            {marginfiAccounts.map((account, index) => (
              <div
                key={index}
                className="flex flex-row items-center gap-2 cursor-pointer"
                onClick={() => {
                  localStorage.setItem("mfiAccount", account.address.toBase58());
                  fetchMrgnlendState();
                }}
              >
                <div className="w-4">{selectedAccount.address.equals(account.address) && <IconChevronRight />}</div>{" "}
                {account.address.toBase58()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
