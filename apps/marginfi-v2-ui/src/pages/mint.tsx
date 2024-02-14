import React from "react";

import Link from "next/link";
import { JupiterProvider } from "@jup-ag/react-hook";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, percentFormatterDyn, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useLstStore, useUiStore } from "~/store";

import { PageHeader } from "~/components/common/PageHeader";
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
} from "~/components/ui/icons";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/ui/loader";

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

enum MintPageState {
  DEFAULT = "default",
  ERROR = "error",
  SUCCESS = "success",
}

interface CardProps {
  title: "YBX" | "LST";
  icon: () => JSX.Element;
  description: string;
  price: string;
  features: string[];
  footer: string;
  action: () => void;
}

export default function MintPage() {
  const { connection } = useConnection();
  const { wallet } = useWalletContext();
  const [mintPageState, setMintPageState] = React.useState<MintPageState>(MintPageState.DEFAULT);
  const [ybxNotificationsDialogOpen, setYbxNotificationsDialogOpen] = React.useState(false);
  const [ybxPartnerDialogOpen, setYbxPartnerDialogOpen] = React.useState(false);
  const [lstDialogOpen, setLSTDialogOpen] = React.useState(false);
  const [integrations, setIntegrations] = React.useState<any[]>([]);
  const emailInputRef = React.useRef<HTMLInputElement>(null);
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
        title: "YBX",
        icon: IconYBX,
        description: "Solana's decentralised stablecoin, backed by LSTs",
        price: "1 YBX ≈ 1 USD",
        features: [
          `Earn compounded staking yield ${percentFormatterDyn.format(lstData?.projectedApy!)}`,
          "Earn MEV rewards",
          "Earn lending yield",
        ],
        footer: "...just by minting YBX",
        action: () => {
          setYbxNotificationsDialogOpen(true);
        },
      } as CardProps,
      {
        title: "LST",
        icon: IconLST,
        description: "Solana's highest yielding LST, secured by mrgn validators",
        price: `1 LST = ${numeralFormatter(lstData?.lstSolValue!)} SOL`,
        features: ["Pay 0% commission", "Earn MEV from Jito", "Access $3 million in liquidity"],
        footer: "...just by minting LST",
        action: () => setLSTDialogOpen(true),
      } as CardProps,
    ],
    [lstData]
  );

  const signUp = React.useCallback(
    async (type: "partner" | "notifications") => {
      if (!emailInputRef.current) {
        return;
      }

      const formId =
        type === "partner"
          ? process.env.NEXT_PUBLIC_CONVERT_KIT_YBX_PARTNER_FORM_UID
          : process.env.NEXT_PUBLIC_CONVERT_KIT_YBX_NOTIFICATIONS_FORM_UID;

      const res = await fetch(`https://api.convertkit.com/v3/forms/${formId}/subscribe`, {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          api_key: process.env.NEXT_PUBLIC_CONVERT_KIT_API_KEY,
          email: emailInputRef.current.value,
        }),
      });

      if (!res.ok) {
        setMintPageState(MintPageState.ERROR);
        return;
      }

      setMintPageState(MintPageState.SUCCESS);
    },
    [emailInputRef]
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
          throw new Error("Failed to fetch integrations");
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
        <PageHeader showDesktopTitle={false}>Mint</PageHeader>
        <div className="w-full max-w-8xl mx-auto px-4 md:px-8 space-y-20 pt-16 lg:pt-20 pb-28">
          {!initialized && <Loader label="Loading YBX / LST..." className="mt-8" />}
          {initialized && (
            <>
              <div className="w-full max-w-3xl mx-auto space-y-20 px-4 md:px-0">
                <h1 className="text-2xl md:text-3xl font-medium text-center leading-normal">
                  Crypto&apos;s highest yielding, decentralised stablecoin Backed by Solana&apos;s MEV-boosted, highest
                  yielding LST
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-11">
                  {cards.map((item, i) => (
                    <Card key={i} variant="secondary">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-3xl">
                          <item.icon />
                          {item.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>{item.description}</p>

                        <p className="text-lg font-semibold my-6">{item.price}</p>

                        <ul className="space-y-2.5 mb-4">
                          {item.features.map((feature, j) => (
                            <li key={j} className="flex items-center gap-1">
                              <IconCheck className="text-success" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <p className="text-right text-sm">{item.footer}</p>

                        {item.title === "LST" ? (
                          <div className="flex items-center gap-2 mt-3">
                            <ActionBoxDialog
                              requestedAction={ActionType.MintLST}
                              requestedToken={undefined}
                              isActionBoxTriggered={lstDialogOpen}
                            >
                              <Button
                                variant="secondary"
                                size="lg"
                                className="mt-4"
                                onClick={() => {
                                  if (item.action) {
                                    item.action();
                                  }
                                }}
                              >
                                Mint {item.title}
                              </Button>
                            </ActionBoxDialog>
                            <Button variant="outline" size="lg" className="mt-4 hover:text-primary">
                              <Link href="/swap?inputMint=LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp">
                                Unstake {item.title}
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          // <ActionBoxDialog
                          //   requestedAction={ActionType.MintYBX}
                          //   requestedToken={new PublicKey("2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB")}
                          //   isActionBoxTriggered={ybxDialogOpen}
                          // >
                          //   <Button
                          //     variant="secondary"
                          //     size="lg"
                          //     className="mt-4"
                          //     onClick={() => {
                          //       if (item.action) {
                          //         item.action();
                          //       }
                          //     }}
                          //   >
                          //     Mint {item.title}
                          //   </Button>
                          // </ActionBoxDialog>
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="secondary"
                              size="lg"
                              className="mt-4"
                              onClick={() => {
                                if (item.action) {
                                  item.action();
                                }
                              }}
                            >
                              <IconBell size={16} /> Early Access
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
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
        <Dialog
          open={ybxNotificationsDialogOpen}
          onOpenChange={(open) => {
            setMintPageState(MintPageState.DEFAULT);
            setYbxNotificationsDialogOpen(open);
          }}
        >
          <DialogContent className="md:flex">
            <DialogHeader>
              <IconYBX size={48} />
              <DialogTitle className="text-2xl">YBX Early Access</DialogTitle>
              <DialogDescription>Sign up to get notified for early access to YBX</DialogDescription>
            </DialogHeader>

            {mintPageState === MintPageState.SUCCESS && (
              <div className="flex flex-col items-center gap-4">
                <p className="flex items-center justify-center gap-2">
                  <IconCheck size={18} className="text-success" /> You are signed up!
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMintPageState(MintPageState.DEFAULT);
                    setYbxNotificationsDialogOpen(false);
                  }}
                >
                  Back to YBX
                </Button>
              </div>
            )}

            {(mintPageState === MintPageState.DEFAULT || mintPageState === MintPageState.ERROR) && (
              <>
                <form
                  className="w-full px-8 mb-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    signUp("notifications");
                  }}
                >
                  <div className="flex items-center w-full gap-2">
                    <Input
                      ref={emailInputRef}
                      type="email"
                      placeholder="example@example.com"
                      className="w-full"
                      required
                    />
                    <Button type="submit">Sign Up</Button>
                  </div>
                </form>

                {mintPageState === MintPageState.ERROR && (
                  <p className="text-destructive-foreground text-sm text-center">Error signing up, please try again.</p>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
        <Dialog
          open={ybxPartnerDialogOpen}
          onOpenChange={(open) => {
            setMintPageState(MintPageState.DEFAULT);
            setYbxPartnerDialogOpen(open);
          }}
        >
          <DialogContent className="md:flex">
            <DialogHeader>
              <IconYBX size={48} />
              <DialogTitle className="text-2xl">YBX Launch Partner Form</DialogTitle>
              <DialogDescription>Sign up to become a YBX launch partner.</DialogDescription>
            </DialogHeader>

            {mintPageState === MintPageState.SUCCESS && (
              <div className="flex flex-col items-center gap-4">
                <p className="flex items-center justify-center gap-2">
                  <IconCheck size={18} className="text-success" /> You are signed up!
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMintPageState(MintPageState.DEFAULT);
                    setYbxPartnerDialogOpen(false);
                  }}
                >
                  Back to YBX
                </Button>
              </div>
            )}

            {(mintPageState === MintPageState.DEFAULT || mintPageState === MintPageState.ERROR) && (
              <>
                <form
                  className="w-full px-8 mb-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    signUp("partner");
                  }}
                >
                  <div className="flex items-center w-full gap-2">
                    <Input
                      ref={emailInputRef}
                      type="email"
                      placeholder="example@example.com"
                      className="w-full"
                      required
                    />
                    <Button type="submit">Sign Up</Button>
                  </div>
                </form>

                {mintPageState === MintPageState.ERROR && (
                  <p className="text-destructive-foreground text-sm text-center">Error signing up, please try again.</p>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </JupiterProvider>
      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}
