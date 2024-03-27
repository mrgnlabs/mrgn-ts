import React from "react";

import Link from "next/link";
import { JupiterProvider } from "@jup-ag/react-hook";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, percentFormatterDyn, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useLstStore, useMrgnlendStore, useUiStore } from "~/store";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { ActionComplete } from "~/components/common/ActionComplete";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import {
  IconYBX,
  IconLST,
  IconCheck,
  IconExternalLink,
  IconBell,
  IconMeteora,
  IconRaydium,
  IconOrca,
  IconSol,
  IconUsd,
} from "~/components/ui/icons";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/ui/loader";
import { LST_MINT } from "~/store/lstStore";
import { PublicKey } from "@solana/web3.js";
import { YbxDialogNotifications } from "~/components/common/Mint/YbxDialogNotifications";
import { MintCardWrapper, YbxDialogPartner } from "~/components/common/Mint";
import { MintCardProps, MintPageState } from "~/utils";

const integrationsData: {
  title: string;
  quoteIcon: string | React.FC;
  baseIcon: string | React.FC;
  poolInfo: {
    dex: string;
    poolId: string;
  };
  info?: {
    tvl: string;
    vol: string;
  };
  link: string;
  action: string;
  platform: {
    title: string;
    icon: React.FC;
  };
}[] = [
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
  {
    title: "LST-bSOL",
    baseIcon: IconLST,
    quoteIcon:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png",
    poolInfo: {
      dex: "orca",
      poolId: "GAbU1sCPSnxQDE3ywBxq9nrBo66J9yAxwNGTyu9Kg1mr",
    },
    link: "https://v1.orca.so/liquidity/browse?tokenMint=LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp",
    action: "Deposit",
    platform: {
      title: "Orca",
      icon: IconOrca,
    },
  },
];

export default function MintPage() {
  const { connection } = useConnection();
  const { wallet } = useWalletContext();
  const [mintPageState, setMintPageState] = React.useState<MintPageState>(MintPageState.DEFAULT);
  const [ybxNotificationsDialogOpen, setYbxNotificationsDialogOpen] = React.useState(false);
  const [ybxPartnerDialogOpen, setYbxPartnerDialogOpen] = React.useState(false);
  const [lstDialogOpen, setLSTDialogOpen] = React.useState(false);
  const [integrations, setIntegrations] = React.useState<any[]>([]);

  const debounceId = React.useRef<NodeJS.Timeout | null>(null);

  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  const [fetchLstState, initialized, setIsRefreshingStore, lstData] = useLstStore((state) => [
    state.fetchLstState,
    state.initialized,
    state.setIsRefreshingStore,
    state.lstData,
  ]);

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
        features: ["Earn 7% APY", "Pay 0% fees", "Access $3 million in liquidity"],
        volume: `234,345 LST`,
        volumeUsd: `$234,345.45`,
        action: () => setLSTDialogOpen(true),
      } as MintCardProps,
      {
        title: "YBX",
        label: "protected USD",
        labelIcon: IconUsd,
        icon: IconYBX,
        description: "Accrues value against USD",
        features: [`Earn compounded staking yield`, "Capture MEV rewards", "Earn lending yield (soon)"],
        volume: `- YBX`,
        volumeUsd: ``,
        action: () => {
          setYbxNotificationsDialogOpen(true);
        },
      } as MintCardProps,
    ],
    [lstData]
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
  }, [integrationsData]);

  return (
    <>
      <JupiterProvider connection={connection} wrapUnwrapSOL={false} platformFeeAndAccounts={undefined}>
        <div className="w-full max-w-8xl mx-auto px-4 md:px-8 space-y-20 pb-28">
          {!initialized && <Loader label="Loading YBX / LST..." className="mt-8" />}
          {initialized && (
            <>
              <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
                <div className="text-3xl font-medium text-center">
                  <h1 className="leading-loose">Inflation protected</h1>
                  <div>
                    <IconSol size={32} className="inline" /> SOL and <IconUsd size={32} className="inline" /> USD
                  </div>
                  <p className="text-sm text-muted-foreground pb-9 pt-6">
                    The two most important assets on Solana are SOL and USD. With YBX and LST, interest compounds
                    automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-11">
                  {cards.map((item, idx) => (
                    <MintCardWrapper mintCard={item} key={idx} />
                  ))}
                </div>
              </div>

              {integrations.length > 0 && (
                <div className="w-full py-8 px-4 md:px-10 xl:px-16 text-center">
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
                    {integrations.map((item, i) => (
                      <Card key={i} variant="default" className="min-w-[300px]">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-center text-xl">
                            <div className="flex items-center">
                              {typeof item.baseIcon === "string" ? (
                                <img src={item.baseIcon} className="w-10 h-10 rounded-full" />
                              ) : (
                                <item.baseIcon size={32} />
                              )}
                              {typeof item.quoteIcon === "string" ? (
                                <img src={item.quoteIcon} className="z-10 w-10 h-10 rounded-full -translate-x-3" />
                              ) : (
                                <item.quoteIcon size={32} className="z-10 -translate-x-4" />
                              )}
                            </div>
                            {item.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            <li className="flex items-center justify-between gap-1">
                              <span className="text-muted-foreground">TVL:</span> {item.info.tvl}
                            </li>
                            <li className="flex items-center justify-between gap-1">
                              <span className="text-muted-foreground">24hr Vol:</span> {item.info.vol}
                            </li>
                          </ul>

                          <Link href={item.link} target="_blank" rel="noreferrer" className="w-full">
                            <Button variant="default" size="lg" className="mt-4 w-full">
                              {item.action} <IconExternalLink size={20} />
                            </Button>
                          </Link>

                          <div className="flex items-center gap-2 mt-4 justify-center">
                            {item.platform.icon && <item.platform.icon size={24} />}
                            <p className="text-muted-foreground text-sm">{item.platform.title}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
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
