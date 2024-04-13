import React from "react";

import Link from "next/link";
import { JupiterProvider } from "@jup-ag/react-hook";

import { groupedNumberFormatterDyn, numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useLstStore, useMrgnlendStore, useUiStore } from "~/store";
import { LST_MINT } from "~/store/lstStore";

import { ActionComplete } from "~/components/common/ActionComplete";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  IconYBX,
  IconLST,
  IconExternalLink,
  IconMeteora,
  IconRaydium,
  IconOrca,
  IconSol,
  IconUsd,
} from "~/components/ui/icons";
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
import { Skeleton } from "~/components/ui/skeleton";
import { PageHeading } from "~/components/common/PageHeading";

const integrationsData: IntegrationsData[] = [
  {
    title: "SOL-LST",
    quoteIcon: IconLST,
    baseIcon:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    poolInfo: {
      dex: "meteora",
      poolId: "J9DoMJRFGiyVcQaL5uPgKBonEEj4aU2TASvW5GKFoByg",
    },
    link: "https://app.meteora.ag/pools/J9DoMJRFGiyVcQaL5uPgKBonEEj4aU2TASvW5GKFoByg",
    action: "Deposit",
    platform: {
      title: "Meteora",
      icon: IconMeteora,
    },
  },
  {
    title: "LST-SOL",
    baseIcon: IconLST,
    quoteIcon:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    poolInfo: {
      dex: "orca",
      poolId: "HJVNnnRj1xz25P9215AHQUvGXoS6MKtJASjgrrwD7GnP",
    },
    link: "https://v1.orca.so/liquidity/browse?tokenMint=LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp",
    action: "Deposit",
    platform: {
      title: "Orca",
      icon: IconOrca,
    },
  },
  {
    title: "SOL-LST",
    quoteIcon: IconLST,
    baseIcon:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    poolInfo: {
      dex: "raydium",
      poolId: "mrWgqCV3i1YhiG3VENnJ8qQUEGEqeBvunrp647pCb7R",
    },
    link: "https://raydium.io/",
    action: "Deposit",
    platform: {
      title: "Raydium",
      icon: IconRaydium,
    },
  },
  // {
  //   title: "LST-bSOL",
  //   baseIcon: IconLST,
  //   quoteIcon:
  //     "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png",
  //   poolInfo: {
  //     dex: "orca",
  //     poolId: "GAbU1sCPSnxQDE3ywBxq9nrBo66J9yAxwNGTyu9Kg1mr",
  //   },
  //   link: "https://v1.orca.so/liquidity/browse?tokenMint=LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp",
  //   action: "Deposit",
  //   platform: {
  //     title: "Orca",
  //     icon: IconOrca,
  //   },
  // },
];

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

  const [fetchLstState, initialized, setIsRefreshingStore, lstData] = useLstStore((state) => [
    state.fetchLstState,
    state.initialized,
    state.setIsRefreshingStore,
    state.lstData,
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
        features: ["Earn Solana's highest yield", "Pay 0% fees", "Stake to mrgn validators"],
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
        features: [`Capture staking yield`, "Capture MEV rewards", "Earn lending yield (soon)"],
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
      const dexPoolIdInfo = integrationsData.map((item) => item.poolInfo);

      // Create search params from the array
      const searchParams = new URLSearchParams();
      dexPoolIdInfo.forEach((item) => {
        searchParams.append("dex", item.dex);
        searchParams.append("poolId", item.poolId);
      });

      try {
        const res = await fetch(`/api/markets?${searchParams.toString()}`);
        if (!res.ok) {
          // throw new Error("Failed to fetch integrations");
          return;
        }
        const data = await res.json();

        const updatedIntegrations = integrationsData
          .map((item, i) => {
            if (!data[i] || !data[i].data) return item;
            return {
              ...item,
              info: {
                tvl: `$${numeralFormatter(data[i].data.tvl)}`,
                vol: `$${numeralFormatter(data[i].data.vol)}`,
              },
            };
          })
          .filter((item) => item.info?.tvl !== "$0");

        setIntegrations(updatedIntegrations);
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
                  {integrations?.length > 0 ? (
                    integrations.map((item, i) => <IntegrationCard integrationsData={item} key={i} />)
                  ) : (
                    <IntegrationCardSkeleton />
                  )}

                  {lstBank?.length > 0 ? (
                    <>
                      <BankIntegrationCard bank={lstBank[0]} isInLendingMode={true} />
                      <BankIntegrationCard bank={lstBank[0]} isInLendingMode={false} />
                    </>
                  ) : (
                    <IntegrationCardSkeleton />
                  )}
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
