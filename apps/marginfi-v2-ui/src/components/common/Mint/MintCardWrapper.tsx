import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { getBlockedActions } from "@mrgnlabs/mrgn-utils";
import { IconCheck, IconBell } from "@tabler/icons-react";

import { MintCardProps } from "~/utils";
import { useMrgnlendStore } from "~/store";
import { ActionBox } from "@mrgnlabs/mrgn-ui";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { LST_MINT } from "~/store/lstStore";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

interface MintCardWrapperProps {
  mintCard: MintCardProps;
}

export const MintCardWrapper: React.FC<MintCardWrapperProps> = ({ mintCard, ...props }) => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const transformedActionGate = React.useMemo(() => getBlockedActions(), []);

  const { connected } = useWallet();

  return (
    <Card variant="default" className="relative">
      <CardHeader className="pt-8">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="absolute top-[-14px] h-[28px] flex gap-2 items-center text-sm font-normal bg-chartreuse text-black pl-1 pr-3 py-3 rounded-[100px]">
            <div>
              <mintCard.labelIcon size={22} />
            </div>
            {mintCard.label}
          </div>
          <mintCard.icon />
          <div className="flex flex-col">
            <h3 className="leading-none">{mintCard.title}</h3>
            <p className="text-sm text-muted-foreground">{mintCard.description}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5 mb-4">
          {mintCard.features.map((feature, j) => (
            <li key={j} className="flex items-center gap-1 text-muted-foreground">
              <IconCheck className="text-success" />
              {feature}
            </li>
          ))}
        </ul>

        {mintCard.title !== "YBX" ? (
          <ul className="flex gap-2 text-xs">
            <li className="text-muted-foreground">TVL</li>
            <li>{mintCard.tvl}</li>
            <li className="text-muted-foreground">|</li>
            <li className="text-muted-foreground">Volume</li>
            <li>{mintCard.volume}</li>
          </ul>
        ) : (
          <ul className="flex gap-2 text-xs">
            <li className="text-muted-foreground">Coming soon</li>
          </ul>
        )}

        {mintCard.title === "LST" && (
          <div className="flex items-center gap-2">
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
                  <Button variant="secondary" size="lg" className="mt-4">
                    Mint {mintCard.title}
                  </Button>
                ),
                title: "Mint LST",
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
                  <Button variant="outline-dark" size="lg" className="mt-4 hover:text-primary">
                    Unstake {mintCard.title}
                  </Button>
                ),
                title: "Unstake LST",
              }}
            />
          </div>
        )}

        {transformedActionGate?.find((value) => value === ActionType.MintYBX) && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="lg"
              className="mt-4"
              onClick={() => {
                if (mintCard.action) {
                  mintCard.action();
                }
              }}
            >
              <IconBell size={16} /> Early Access
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
