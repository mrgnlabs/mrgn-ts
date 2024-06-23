import React from "react";

import Link from "next/link";
import { JupiterProvider } from "@jup-ag/react-hook";

import { groupedNumberFormatterDyn, numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useLstStore, useMrgnlendStore, useUiStore } from "~/store";
import { LST_MINT } from "~/store/lstStore";

import { ActionComplete } from "~/components/common/ActionComplete";
import { IconYBX, IconLST, IconSol, IconUsd } from "~/components/ui/icons";
import { Loader } from "~/components/ui/loader";
import { YbxDialogNotifications } from "~/components/common/Mint/YbxDialogNotifications";
import {
  BankIntegrationCard,
  IntegrationCard,
  IntegrationCardSkeleton,
  MintCardWrapper,
  YbxDialogPartner,
} from "~/components/common/Mint";
import {
  IntegrationsData,
  MintCardProps,
  MintOverview,
  MintPageState,
  clampedNumeralFormatter,
  fetchMintOverview,
} from "~/utils";
import { PageHeading } from "~/components/common/PageHeading";

export default function MintPage() {
  const { connection } = useConnection();
  const { wallet } = useWalletContext();
  const [mintPageState, setMintPageState] = React.useState<MintPageState>(MintPageState.DEFAULT);
  const [ybxNotificationsDialogOpen, setYbxNotificationsDialogOpen] = React.useState(false);
  const [ybxPartnerDialogOpen, setYbxPartnerDialogOpen] = React.useState(false);
  const [lstDialogOpen, setLSTDialogOpen] = React.useState(false);
  const [integrations, setIntegrations] = React.useState<IntegrationsData[]>([]);
  const [lstOverview, setLstOverview] = React.useState<MintOverview>();

  const debounceId = React.useRef<NodeJS.Timeout | null>(null);

  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  const [fetchLstState, initialized, setIsRefreshingStore] = useLstStore((state) => [
    state.fetchLstState,
    state.initialized,
    state.setIsRefreshingStore,
  ]);

  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const lstBank = React.useMemo(
    () => extendedBankInfos.filter((bank) => bank.info.state.mint.equals(LST_MINT)),
    [extendedBankInfos]
  );

  React.useEffect(() => {
    fetchVolumeData();
  }, []);

  const fetchVolumeData = async () => {
    try {
      const overview = await fetchMintOverview(LST_MINT.toString());
      setLstOverview(overview);
    } catch (error) {
      console.error("Something went wrong fetching LST volume");
    }
  };

  React.useEffect(() => {
    const fetchData = () => {
      setIsRefreshingStore(true);
      fetchLstState({ connection, wallet }).catch(console.error);
    };

    if (debounceId.current) {
      clearTimeout(debounceId.current);
    }

    debounceId.current = setTimeout(() => {
      fetchData();

      const id = setInterval(() => {
        setIsRefreshingStore(true);
        fetchLstState().catch(console.error);
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
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = React.useMemo(
    () => [
      {
        title: "LST",
        label: "protected SOL",
        labelIcon: IconSol,
        icon: IconLST,
        description: "Accrues value against SOL",
        features: ["Solana's highest yielding LST", "Pay no fees/commission", "Capture MEV rewards"],
        volume: lstOverview?.volumeUsd ? `${groupedNumberFormatterDyn.format(lstOverview?.volume)} LST` : "-",
        volumeUsd: lstOverview?.volumeUsd ? usdFormatter.format(lstOverview?.volumeUsd) : "-",
        tvl: lstOverview?.tvl ? clampedNumeralFormatter(lstOverview?.tvl) : "-",
        action: () => setLSTDialogOpen(true),
      } as MintCardProps,
      {
        title: "YBX",
        label: "protected USD",
        labelIcon: IconUsd,
        icon: IconYBX,
        description: "Accrues value against USD",
        features: [`Solana's decentralized stable-asset`, "Capture staking yield", "Capture MEV rewards"],
        volume: `YBX`,
        volumeUsd: ``,
        tvl: "",
        action: () => {
          setYbxNotificationsDialogOpen(true);
        },
      } as MintCardProps,
    ],
    [lstOverview]
  );

  React.useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const res = await fetch(`/api/birdeye/markets?token=` + LST_MINT);
        if (!res.ok) {
          // throw new Error("Failed to fetch integrations");
          return;
        }
        const data = await res.json();
        setIntegrations(data);
      } catch (error) {
        console.error("Failed to fetch integrations data:", error);
        // Handle error or set some error state here
      }
    };

    fetchIntegrations();
  }, []);

  return (
    <>
      <JupiterProvider connection={connection} wrapUnwrapSOL={false} platformFeeAndAccounts={undefined}>
        <div className="w-full max-w-8xl mx-auto px-4 md:px-8 space-y-20 pb-28">
          {!initialized && <Loader label="Loading YBX / LST..." className="mt-8" />}
          {initialized && (
            <>
              <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
                <PageHeading
                  heading={
                    <>
                      <h1 className="leading-normal">Inflation protected</h1>
                      <div className="text-3xl leading-normal flex items-center gap-2 pb-2 justify-center">
                        <IconSol size={32} />
                        <p>SOL</p>
                        <p className="mx-2">and</p>
                        <IconUsd size={32} />
                        <p>USD</p>
                      </div>
                    </>
                  }
                  body={
                    <p>
                      The two most important assets on Solana are SOL and USD.
                      <br className="hidden lg:block" /> Capture inflation automatically with LST and YBX.
                    </p>
                  }
                  links={[]}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-11 mt-8">
                  {cards.map((item, idx) => (
                    <MintCardWrapper mintCard={item} key={idx} />
                  ))}
                </div>
              </div>

              <div className="w-full py-4 px-4 md:px-10 xl:px-16 text-center">
                <h2 className="text-3xl font-medium mb-3">Integrations</h2>
                <p className="text-muted-foreground">
                  Ready to integrate YBX?{" "}
                  <button
                    className="border-b border-primary text-primary transition-colors hover:text-chartreuse hover:border-chartreuse"
                    onClick={() => setYbxPartnerDialogOpen(true)}
                  >
                    Become a launch partner.
                  </button>
                </p>
                <div className="flex items-center justify-center flex-wrap gap-8 mt-10 w-full">
                  {lstBank?.length > 0 ? (
                    <>
                      <BankIntegrationCard bank={lstBank[0]} isInLendingMode={true} />
                    </>
                  ) : (
                    <IntegrationCardSkeleton />
                  )}
                  {integrations?.length > 0
                    ? integrations.map((item, i) => <IntegrationCard integrationsData={item} key={i} />)
                    : [...new Array(5)].map((_, index) => <IntegrationCardSkeleton key={index} />)}
                </div>
              </div>
            </>
          )}
        </div>
        <YbxDialogNotifications
          onClose={() => setYbxNotificationsDialogOpen(false)}
          mintPageState={mintPageState}
          onHandleChangeMintPage={(state) => setMintPageState(state)}
          open={ybxNotificationsDialogOpen}
          onOpenChange={(open) => {
            setMintPageState(MintPageState.DEFAULT);
            setYbxNotificationsDialogOpen(open);
          }}
        />
        <YbxDialogPartner
          onClose={() => setYbxPartnerDialogOpen(false)}
          mintPageState={mintPageState}
          onHandleChangeMintPage={(state) => setMintPageState(state)}
          open={ybxPartnerDialogOpen}
          onOpenChange={(open) => {
            setMintPageState(MintPageState.DEFAULT);
            setYbxPartnerDialogOpen(open);
          }}
        />
      </JupiterProvider>
      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}
