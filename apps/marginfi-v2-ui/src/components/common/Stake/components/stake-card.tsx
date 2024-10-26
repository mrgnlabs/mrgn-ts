import { IconCheck } from "@tabler/icons-react";

import { ActionBox } from "@mrgnlabs/mrgn-ui";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { capture } from "@mrgnlabs/mrgn-utils";
import { LSTOverview } from "~/components/common/Stake/utils/stake-utils";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "~/components/ui/card";
import { IconLST } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

type StakeCardProps = {
  lstBank?: ExtendedBankInfo;
  lstOverview?: LSTOverview;
  connected: boolean;
};

const StakeCard = ({ lstBank, lstOverview, connected }: StakeCardProps) => {
  return (
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

        {lstOverview && (
          <ul className="flex gap-2 text-sm md:text-base">
            <li className="text-muted-foreground">TVL</li>
            <li>{usdFormatter.format(lstOverview.tvl)}</li>
            <li className="text-muted-foreground ml-4">Volume</li>
            <li>{usdFormatter.format(lstOverview.volumeUsd)}</li>
          </ul>
        )}
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
            requestedBank: lstBank,
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
  );
};

export { StakeCard };
