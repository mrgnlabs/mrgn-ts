import React from "react";
import Link from "next/link";

import { groupedNumberFormatterDyn, clampedNumeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { IconCheck } from "@tabler/icons-react";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { capture } from "@mrgnlabs/mrgn-utils";
import { useConnection } from "~/hooks/use-connection";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { useMrgnlendStore, useUiStore, useLstStore } from "~/store";
import { LST_MINT } from "~/store/lstStore";

import { IconYBX, IconSol, IconLST, IconArena } from "~/components/ui/icons";
import { YbxDialogNotifications } from "~/components/common/Mint/YbxDialogNotifications";
import {
  BankIntegrationCard,
  IntegrationCard,
  IntegrationCardSkeleton,
  MintCardWrapper,
  YbxDialogPartner,
} from "~/components/common/Mint";
import { IntegrationsData, MintCardProps, MintOverview, MintPageState, fetchMintOverview } from "~/utils";
import { PageHeading } from "~/components/common/PageHeading";
import { StakeBoxProvider, ActionBox } from "@mrgnlabs/mrgn-ui";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "~/components/ui/card";

export default function MintPage() {
  const { connection } = useConnection();
  const { connected, wallet } = useWallet();
  const [mintPageState, setMintPageState] = React.useState<MintPageState>(MintPageState.DEFAULT);
  const [ybxNotificationsDialogOpen, setYbxNotificationsDialogOpen] = React.useState(false);
  const [ybxPartnerDialogOpen, setYbxPartnerDialogOpen] = React.useState(false);
  const [integrations, setIntegrations] = React.useState<IntegrationsData[]>([]);
  const [lstOverview, setLstOverview] = React.useState<MintOverview>();

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
    <StakeBoxProvider>
      <div className="flex flex-col items-center justify-center min-h-[800px] h-[calc(100vh-140px)]">
        <div className="w-full max-w-8xl mx-auto relative -translate-y-10 md:-translate-y-12">
          <PageHeading
            heading="Stake and Earn Instantly"
            size="lg"
            body={
              <p>
                <strong className="text-chartreuse">Earn extra yield</strong> and{" "}
                <strong className="text-chartreuse">compound your returns</strong> in just a few clicks. Lend and borrow
                against your position, stay flexible, and engage with the{" "}
                <strong className="text-chartreuse">best opportunities in DeFi</strong>.
              </p>
            }
          />

          <div className="px-4 md:mt-2">
            <Card variant="gradient" className="w-full max-w-xl mx-auto py-2 md:py-4">
              <CardHeader className="items-center text-center gap-3">
                <IconLST size={56} />
                <CardTitle className="text-2xl">
                  Stake with mrgn validators
                  <br /> and mint LST
                </CardTitle>
                <CardDescription className="sr-only">Stake with mrgn validators and mint LST.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <ul className="space-y-2.5 mb-4 md:mb-8 md:text-lg">
                  <li className="flex items-center gap-1.5 text-muted-foreground">
                    <IconCheck className="text-success" />
                    ~9% natural APY
                  </li>
                  <li className="flex items-center gap-1.5 text-muted-foreground">
                    <IconCheck className="text-success" />
                    0% commissions
                  </li>
                  <li className="flex items-center gap-1.5 text-muted-foreground">
                    <IconCheck className="text-success" />
                    Capture MEV rewards
                  </li>
                </ul>

                <ul className="flex gap-2 text-sm md:text-base">
                  {lstOverview?.tvl && (
                    <>
                      <li className="text-muted-foreground">TVL</li>
                      <li>{usdFormatter.format(lstOverview.tvl)}</li>
                    </>
                  )}
                  {lstOverview?.volumeUsd && (
                    <>
                      <li className="text-muted-foreground ml-4">Volume</li>
                      <li>{usdFormatter.format(lstOverview.volumeUsd)}</li>
                    </>
                  )}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-row justify-center gap-4 pt-2 md:pt-4">
                <ActionBox.Stake
                  isDialog={true}
                  useProvider={true}
                  stakeProps={{
                    connected: connected,
                    requestedActionType: ActionType.MintLST,
                    captureEvent: (event, properties) => {
                      capture("stake_button_click", properties);
                    },
                  }}
                  dialogProps={{
                    trigger: (
                      <Button size="lg" className="text-lg h-12 border-none">
                        Stake
                      </Button>
                    ),
                    title: "Stake",
                  }}
                />
                <ActionBox.Stake
                  isDialog={true}
                  useProvider={true}
                  stakeProps={{
                    connected: connected,
                    requestedActionType: ActionType.UnstakeLST,
                    requestedBank: extendedBankInfos.find((bank) => bank?.info?.state?.mint.equals(LST_MINT)),
                    captureEvent: (event, properties) => {
                      capture("unstake_button_click", properties);
                    },
                  }}
                  dialogProps={{
                    trigger: (
                      <Button variant="secondary" size="lg" className="text-lg h-12">
                        Unstake
                      </Button>
                    ),
                    title: "Unstake",
                  }}
                />
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 mb-24 w-full bg-background-gray/50 border-y border-border pt-12 pb-14 px-8 md:px-0">
        <IconArena size={56} className="text-white" />
        <h2 className="text-3xl font-medium">LST in The Arena</h2>
        <p className="text-muted-foreground w-full max-w-2xl mx-auto text-center text-lg">
          The Arena is a permissionless trading platform that allows you to go levered long / short on any asset on
          Solana. With full support for LST as collateral.
        </p>

        <Link href="https://www.thearena.trade" target="_blank" rel="noreferrer">
          <Button className="mt-4" size="lg">
            <IconArena size={18} /> Enter The Arena
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-8xl mx-auto pb-32">
        <div className="w-full max-w-6xl mx-auto py-4 px-4 md:px-10 xl:px-16 text-center">
          <h2 className="text-3xl font-medium mb-3">LST Integrations</h2>
          <p className="text-muted-foreground">
            Ready to integrate YBX?{" "}
            <button
              className="block mx-auto border-b border-primary text-primary transition-colors hover:text-chartreuse hover:border-chartreuse md:inline"
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
      </div>
    </StakeBoxProvider>
  );
}
