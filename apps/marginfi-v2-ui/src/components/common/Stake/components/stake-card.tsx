import React from "react";

import { IconCheck } from "@tabler/icons-react";

import { ActionBox } from "@mrgnlabs/mrgn-ui";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { capture } from "@mrgnlabs/mrgn-utils";
import { LSTOverview } from "~/components/common/Stake/utils/stake-utils";
import { useIsMobile } from "~/hooks/use-is-mobile";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "~/components/ui/card";
import { IconLST } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

type StakeCardProps = {
  lstBank?: ExtendedBankInfo;
  lstOverview?: LSTOverview;
  connected: boolean;
};

const StakeCard = ({ lstBank, lstOverview, connected }: StakeCardProps) => {
  const isMobile = useIsMobile();

  const scrollPageDown = () => {
    const stakeCalculator = document.getElementById("stake-calculator");
    if (!stakeCalculator) return;
    const rect = stakeCalculator.getBoundingClientRect();
    window.scrollTo({
      top: rect.top - (isMobile ? 80 : 135),
      behavior: "smooth",
    });
  };

  return (
    <Card variant="gradient" className="w-full max-w-xl mx-auto py-2 md:py-4">
      <CardHeader className="items-center text-center gap-3 pb-4 md:pb-6">
        <IconLST size={56} />
        <CardTitle className="text-xl md:text-2xl">
          Stake with mrgn validators
          <br /> and mint LST
        </CardTitle>
        <CardDescription className="sr-only">Stake with mrgn validators and mint LST.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <ul className="space-y-2.5 mb-4 md:mb-8 md:text-lg">
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <IconCheck className="text-success" size={isMobile ? 18 : 24} />
            ~9% natural APY
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
          <ul className="flex gap-2 text-sm md:text-base">
            <li className="text-muted-foreground">TVL</li>
            <li>{usdFormatter.format(lstOverview.tvl)}</li>
            <li className="text-muted-foreground ml-4">Volume</li>
            <li>{usdFormatter.format(lstOverview.volumeUsd)}</li>
          </ul>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4 pt-0 pb-2 md:pt-4">
        <div className="flex flex-row justify-center gap-4">
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
                <Button size="lg" className="md:text-lg md:h-12 border-none">
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
              requestedBank: lstBank,
              captureEvent: (event, properties) => {
                capture("unstake_button_click", properties);
              },
            }}
            dialogProps={{
              trigger: (
                <Button variant="secondary" size="lg" className="md:text-lg md:h-12">
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
