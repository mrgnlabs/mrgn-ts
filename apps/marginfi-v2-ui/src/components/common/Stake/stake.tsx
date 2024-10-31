import React from "react";
import Link from "next/link";

import { StakeBoxProvider, StakeCalculator } from "@mrgnlabs/mrgn-ui";

import { useMrgnlendStore } from "~/store";
import { useWallet } from "~/components/wallet-v2";
import { LST_MINT } from "~/store/lstStore";
import { IntegrationsData, LSTOverview, fetchLSTOverview } from "~/components/common/Stake/utils/stake-utils";

import { Button } from "~/components/ui/button";
import { IconArena } from "~/components/ui/icons";
import { PageHeading } from "~/components/common/PageHeading";

import {
  StakeCard,
  IntegrationCard,
  IntegrationCardSkeleton,
  MfiIntegrationCard,
  ArenaIntegrationCard,
} from "~/components/common/Stake";

const Stake = () => {
  const { connected } = useWallet();
  const [fetchMrgnlendState] = useMrgnlendStore((state) => [state.fetchMrgnlendState]);
  const [integrations, setIntegrations] = React.useState<IntegrationsData[]>([]);
  const [lstOverview, setLstOverview] = React.useState<LSTOverview>();

  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const lstBank = React.useMemo(() => {
    const bank = extendedBankInfos.filter((bank) => bank.info.state.mint.equals(LST_MINT));
    return bank.length > 0 ? bank[0] : undefined;
  }, [extendedBankInfos]);

  React.useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const res = await fetch(`/api/birdeye/markets?token=` + LST_MINT);
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        setIntegrations(data);
      } catch (error) {
        console.error("Failed to fetch integrations data:", error);
      }
    };
    fetchIntegrations();
  }, []);

  React.useEffect(() => {
    const fetchVolumeData = async () => {
      try {
        const overview = await fetchLSTOverview(LST_MINT.toString());
        setLstOverview(overview);
      } catch (error) {
        console.error("Something went wrong fetching LST volume");
      }
    };

    fetchVolumeData();
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
            <StakeCard lstBank={lstBank} lstOverview={lstOverview} connected={connected} />
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-medium">Stake Calculator</h2>
          <p className="text-muted-foreground text-lg">
            Calculate your potential yield by staking with mrgn validators and minting LST.
          </p>
        </div>
        <StakeCalculator />
      </div>

      <div className="flex flex-col items-center justify-center gap-4 mt-28 mb-24 w-full bg-background-gray/50 border-y border-border pt-12 pb-14 px-8 md:px-0">
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
          <p className="text-muted-foreground text-lg">
            Lend and borrow against your position with and engage with the{" "}
            <strong className="text-chartreuse">best opportunities in DeFi</strong>.
          </p>
          <div className="flex items-center justify-center flex-wrap gap-8 mt-10 w-full">
            {lstBank ? (
              <MfiIntegrationCard lstBank={lstBank} connected={connected} fetchMrgnlendState={fetchMrgnlendState} />
            ) : (
              <IntegrationCardSkeleton />
            )}
            <ArenaIntegrationCard connected={connected} />
            {integrations?.length > 0
              ? integrations.map((item, i) => <IntegrationCard integrationsData={item} key={i} />)
              : [...new Array(5)].map((_, index) => <IntegrationCardSkeleton key={index} />)}
          </div>
        </div>
      </div>
    </StakeBoxProvider>
  );
};

export { Stake };
