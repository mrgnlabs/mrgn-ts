import dynamic from "next/dynamic";
import { AppProps } from "next/app";
import React, { useMemo } from "react";
import { Desktop, Mobile } from "~/mediaQueryUtils";

import { Meta } from "~/components/common/Meta";
import { cn } from "~/theme";
import { MobileNavbar } from "~/components/mobile/MobileNavbar/MobileNavbar";
import { useAppStore, useMrgnlendStore, useUiStore } from "~/store";
import { MixinProvider } from "~/context";
import { generateEndpoint } from "~/rpc.utils";

import config from "~/config";
import { ConnectionProvider, useConnection } from "~/hooks/use-connection";
import { DomelendProvider } from "~/context/DomelendProvider";
import { ActionProvider } from "~/components/action-box-v2/contexts/action";
import { ActionBoxProvider } from "~/components/action-box-v2/contexts/actionbox";
import { Connection } from "@solana/web3.js";
import { ToastProvider } from "@mrgnlabs/mrgn-toasts";
import { GlobalActionBoxPortal } from "~/components/common/global-actionbox-portal/global-actionbox-portal";

// Use require instead of import since order matters
require("~/styles/globals.css");
require("~/styles/fonts.css");

const Footer = dynamic(async () => (await import("~/components/desktop/Footer")).Footer, { ssr: false });

const Navbar = dynamic(async () => (await import("~/components/common/Navbar")).Navbar, {
  ssr: false,
});
type MrgnAppProps = { path: string };

export default function App({ Component, pageProps, path }: AppProps & MrgnAppProps) {
  const [
    broadcastType,
    priorityFees,
    setIsFetchingData,
    displaySettings,
    setDisplaySettings,
    jupiterOptions,
    priorityType,
    maxCapType,
    globalActionBoxProps,
  ] = useUiStore((state) => [
    state.broadcastType,
    state.priorityFees,
    state.setIsFetchingData,
    state.displaySettings,
    state.setDisplaySettings,
    state.jupiterOptions,
    state.priorityType,
    state.maxCapType,
    state.globalActionBoxProps,
  ]);
  const [
    isMrgnlendStoreInitialized,
    isRefreshingMrgnlendStore,
    marginfiClient,
    selectedAccount,
    extendedBankInfos,
    nativeSolBalance,
    accountSummary,
  ] = useMrgnlendStore((state) => [
    state.initialized,
    state.isRefreshingStore,
    state.marginfiClient,
    state.selectedAccount,
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.accountSummary,
  ]);
  const connection = useMemo(() => new Connection(config.rpcEndpoint, { commitment: "confirmed" }), [config]);

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

  const [ready, setReady] = React.useState(false);
  const [rpcEndpoint, setRpcEndpoint] = React.useState("");

  React.useEffect(() => {
    const init = async () => {
      const rpcEndpoint = await generateEndpoint(config.rpcEndpoint, process.env.NEXT_PUBLIC_RPC_PROXY_KEY ?? "");
      setRpcEndpoint(rpcEndpoint);
      setReady(true);
    };

    init();
  }, []);

  return (
    <>
      {/* <Meta path={path} /> */}
      {ready && rpcEndpoint && (
        <>
          <MixinProvider>
            <ConnectionProvider endpoint={rpcEndpoint} connection={connection}>
              <DomelendProvider>
                <ActionProvider
                  transactionSettings={{
                    broadcastType,
                    priorityType,
                    maxCap: priorityFees.maxCapUi ?? 0,
                    maxCapType,
                  }}
                  jupiterOptions={{ ...jupiterOptions, slippageBps: jupiterOptions.slippageBps }}
                  priorityFees={priorityFees}
                >
                  <ActionBoxProvider
                    banks={extendedBankInfos}
                    nativeSolBalance={nativeSolBalance}
                    marginfiClient={marginfiClient}
                    selectedAccount={selectedAccount}
                    connected={connected}
                    accountSummaryArg={accountSummary}
                    setDisplaySettings={setDisplaySettings}
                    isMixinLend={true}
                    getUserMix={getUserMix}
                    computerInfo={computerInfo}
                    connection={connection}
                    computerAccount={computerAccount}
                    getComputerRecipient={getComputerRecipient}
                    balanceAddressMap={balanceAddressMap}
                    fetchTransaction={mixinClient.utxo.fetchTransaction}
                  >
                    <Navbar />
                    <Desktop>
                      {/* <WalletModalProvider> */}
                      <div className={cn("w-full flex flex-col justify-center items-center")}>
                        <Component {...pageProps} />
                      </div>
                      <Footer />
                      {/* </WalletModalProvider> */}
                    </Desktop>

                    <Mobile>
                      <div className={cn("w-full flex flex-col justify-center items-center")}>
                        <Component {...pageProps} />
                      </div>
                      <MobileNavbar />
                    </Mobile>

                    <ToastProvider />
                    {globalActionBoxProps.isOpen && <GlobalActionBoxPortal />}
                  </ActionBoxProvider>
                </ActionProvider>
              </DomelendProvider>
            </ConnectionProvider>
          </MixinProvider>
        </>
      )}
    </>
  );
}
