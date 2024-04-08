import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { MintCardProps, getBlockedActions } from "~/utils";
import { useMrgnlendStore } from "~/store";

import { IconCheck, IconBell } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { LST_MINT } from "~/store/lstStore";
import { PublicKey } from "@solana/web3.js";

interface MintCardWrapperProps {
  mintCard: MintCardProps;
}

export const MintCardWrapper: React.FC<MintCardWrapperProps> = ({ mintCard, ...props }) => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const [requestedAction, setRequestedAction] = React.useState<ActionType>(ActionType.MintLST);

  const transformedActionGate = React.useMemo(() => getBlockedActions(), []);

  const requestedToken = React.useMemo(
    () =>
      extendedBankInfos.find((bank) => bank?.info?.state?.mint.equals && bank?.info?.state?.mint.equals(LST_MINT))
        ?.address,
    [extendedBankInfos]
  );
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

        {/* <div className="mt-4">
          <a className="text-muted-foreground my-4 cursor-pointer text-sm">How it works?</a>
        </div> */}
        {mintCard.title === "LST" ? (
          <ActionBoxDialog
            requestedAction={requestedAction}
            requestedToken={requestedAction === ActionType.UnstakeLST ? requestedToken : undefined}
          >
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="lg"
                className="mt-4"
                onClick={() => {
                  setRequestedAction(ActionType.MintLST);
                }}
              >
                Mint {mintCard.title}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="mt-4 hover:text-primary"
                onClick={() => {
                  setRequestedAction(ActionType.UnstakeLST);
                }}
              >
                Unstake {mintCard.title}
              </Button>
            </div>
          </ActionBoxDialog>
        ) : transformedActionGate?.find((value) => value === ActionType.MintYBX) ? (
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
        ) : (
          <ActionBoxDialog
            requestedAction={ActionType.MintYBX}
            requestedToken={new PublicKey("2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB")}
          >
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="lg" className="mt-4">
                Mint
              </Button>
            </div>
          </ActionBoxDialog>
        )}
      </CardContent>
    </Card>
  );
};
