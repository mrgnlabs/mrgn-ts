import React from "react";

import { IconCheck } from "@tabler/icons-react";

import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { capture } from "@mrgnlabs/mrgn-utils";
import { LSTOverview } from "~/components/common/Stake/utils/stake-utils";
import { useIsMobile } from "~/hooks/use-is-mobile";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "~/components/ui/card";
import { IconLST } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { useRefreshUserData } from "@mrgnlabs/mrgn-state";

type StakeCardProps = {
  lstBank?: ExtendedBankInfo;
  lstOverview?: LSTOverview;
  connected: boolean;
  extendedBankInfosWithoutStakedAssets: ExtendedBankInfo[];
};

const StakeCard = ({ lstBank, lstOverview, connected, extendedBankInfosWithoutStakedAssets }: StakeCardProps) => {
  const isMobile = useIsMobile();
  const refreshUserData = useRefreshUserData();

  const scrollPageDown = () => {
    const stakeCalculator = document.getElementById("stake-calculator");
    if (!stakeCalculator) return;
    const rect = stakeCalculator.getBoundingClientRect();
    window.scrollTo({
      top: rect.top - (isMobile ? 80 : 150),
      behavior: "smooth",
    });
  };

  return (
    <Card variant="gradient" className="w-full max-w-xl mx-auto py-2 md:py-4">
      <CardHeader className="items-center text-center gap-3 pb-6">
        <IconLST size={56} />
        <CardTitle className="text-lg md:text-xl">
          Stake your SOL with marginfi validators
          <br className="hidden md:block" /> and mint our liquid staking token LST
        </CardTitle>
        <CardDescription className="sr-only">
          Stake your SOL with marginfi validators and mint our liquid staking token LST
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center text-sm md:text-base">
        <ul className="space-y-2.5 mb-6 md:mb-8">
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <IconCheck className="text-success" size={isMobile ? 18 : 24} />
            {lstOverview?.apy ? lstOverview.apy : "~8.5"}% APY
          </li>
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <IconCheck className="text-success" size={isMobile ? 18 : 24} />
            0% commissions
          </li>
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <IconCheck className="text-success" size={isMobile ? 18 : 24} />
            Capture MEV rewards
          </li>
        </ul>

        {lstOverview && (
          <ul className="flex flex-col items-center md:items-start md:flex-row">
            <li className="text-muted-foreground md:mr-2 md:mb-2">LST TVL</li>
            <li className="mb-4 md:mb-0">{usdFormatter.format(lstOverview.tvl)}</li>
            <li className="text-muted-foreground md:mr-2 md:ml-4 md:mb-2">LST Volume</li>
            <li>{usdFormatter.format(lstOverview.volumeUsd)}</li>
          </ul>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4 pb-2 pt-2 md:pt-4">
        <div className="flex flex-row justify-center gap-4">
          <ActionBox.Stake
            isDialog={true}
            useProvider={true}
            stakeProps={{
              banks: extendedBankInfosWithoutStakedAssets,
              connected: connected,
              requestedActionType: ActionType.MintLST,
              lstBank: lstBank,
              captureEvent: (event, properties) => {
                capture("user_stake", properties);
              },
              onComplete: () => {
                refreshUserData();
              },
            }}
            dialogProps={{
              trigger: (
                <Button size="lg" className="border-none">
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
              banks: extendedBankInfosWithoutStakedAssets,
              requestedActionType: ActionType.UnstakeLST,
              requestedBank: lstBank,
              captureEvent: (event, properties) => {
                capture("user_unstake", properties);
              },
              onComplete: () => {
                refreshUserData();
              },
            }}
            dialogProps={{
              trigger: (
                <Button variant="secondary" size="lg">
                  Unstake
                </Button>
              ),
              title: "Unstake",
            }}
          />
        </div>
        <Button
          variant="link"
          className="text-muted-foreground font-normal underline hover:no-underline"
          onClick={scrollPageDown}
        >
          Try our stake calculator
        </Button>
      </CardFooter>
    </Card>
  );
};

export { StakeCard };
