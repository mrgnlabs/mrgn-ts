import React from "react";
import Link from "next/link";

import { StakeBoxProvider, StakeCalculator, useWallet } from "@mrgnlabs/mrgn-ui";
import { IconCheck } from "@tabler/icons-react";

import { IntegrationsData, LSTOverview, fetchLSTOverview } from "~/components/common/Stake/utils/stake-utils";

import { Button } from "~/components/ui/button";
import { IconArena } from "~/components/ui/icons";
import { PageHeading } from "~/components/common/PageHeading";

import { StakeCard, IntegrationCard, IntegrationCardSkeleton, MfiIntegrationCard } from "~/components/common/Stake";
import { PublicKey } from "@solana/web3.js";
import { useExtendedBanks, useRefreshUserData } from "@mrgnlabs/mrgn-state";

const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const LST_MINT = new PublicKey("LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp");

const Stake = () => {
  const { connected } = useWallet();
  const { extendedBanks } = useExtendedBanks();
  const refreshUserData = useRefreshUserData();

  const extendedBankInfosWithoutStakedAssets = React.useMemo(() => {
    return extendedBanks.filter((bank) => bank.info.rawBank.config.assetTag !== 2);
  }, [extendedBanks]);

  const [integrations, setIntegrations] = React.useState<IntegrationsData[]>([]);
  const [lstOverview, setLstOverview] = React.useState<LSTOverview>();

  const lstBank = React.useMemo(() => {
    const bank = extendedBankInfosWithoutStakedAssets.filter((bank) => bank.info.state.mint.equals(LST_MINT));
    return bank.length > 0 ? bank[0] : undefined;
  }, [extendedBankInfosWithoutStakedAssets]);

  const solPrice = React.useMemo(() => {
    const bank = extendedBankInfosWithoutStakedAssets.filter((bank) => bank.info.state.mint.equals(SOL_MINT));
    return bank.length > 0 ? Math.round(bank[0].info.state.price) : 0;
  }, [extendedBankInfosWithoutStakedAssets]);

  React.useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const res = await fetch(`/api/tokens/markets?token=` + LST_MINT);
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
        const overview = await fetchLSTOverview();
        setLstOverview(overview);
      } catch (error) {
        console.error("Something went wrong fetching LST volume");
      }
    };

    fetchVolumeData();
  }, []);

  return (
    <StakeBoxProvider>
      <div className="flex flex-col items-center justify-center md:min-h-[800px] md:h-[calc(100vh-140px)]">
        <div className="w-full mx-auto relative md:-translate-y-12">
          <PageHeading
            heading="Stake and Earn Instantly"
            size="lg"
            body={
              <div className="space-y-2">
                <p>
                  <strong className="text-chartreuse">Earn extra yield</strong> and{" "}
                  <strong className="text-chartreuse">compound your returns</strong> in just a few clicks. Lend and
                  borrow against your position, stay flexible, and engage with the{" "}
                  <strong className="text-chartreuse">best opportunities in DeFi</strong>.
                </p>
                <p className="hidden md:block">
                  <strong className="font-medium">
                    By staking your crypto with marginfi, you earn yield instantly to grow your portfolio faster.
                  </strong>
                </p>
              </div>
            }
          />

          <div className="px-4 md:mt-2">
            <StakeCard
              extendedBankInfosWithoutStakedAssets={extendedBankInfosWithoutStakedAssets}
              lstBank={lstBank}
              lstOverview={lstOverview}
              connected={connected}
            />
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto text-center mt-12 md:mt-0" id="stake-calculator">
        <h2 className="text-2xl font-medium md:text-3xl">Crypto Staking Calculator</h2>
        <p className="text-muted-foreground px-8 text-lg mt-3 md:px-0">
          Calculate your future earnings with our crypto staking calculator.
        </p>
        <ul className="flex flex-col gap-2 items-center justify-center mt-6 text-chartreuse text-sm md:mt-3 md:text-base md:flex-row md:gap-8">
          <li className="flex items-center gap-2">
            <IconCheck size={18} className="text-chartreuse" />
            Maximize rewards
          </li>
          <li className="flex items-center gap-2">
            <IconCheck size={18} className="text-chartreuse" />
            Earn passive income
          </li>
          <li className="flex items-center gap-2">
            <IconCheck size={18} className="text-chartreuse" />
            Protect wealth against inflation
          </li>
        </ul>
        <div className="mt-12">
          <StakeCalculator solPrice={solPrice} apy={lstOverview?.apy || 8.5} />
        </div>
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
            Earn {lstOverview?.apy || 8.5}% APY, lend and borrow against your staked SOL, and engage with the{" "}
            <strong className="text-chartreuse">best opportunities in DeFi</strong>.
          </p>
          <div className="flex items-center justify-center flex-wrap gap-8 mt-10 w-full">
            {lstBank ? (
              <MfiIntegrationCard lstBank={lstBank} connected={connected} refreshUserData={refreshUserData} />
            ) : (
              <IntegrationCardSkeleton />
            )}
            {/* 
            // TODO: Enable Arena integration once it's ready
            <ArenaIntegrationCard connected={connected} /> 
            */}
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
