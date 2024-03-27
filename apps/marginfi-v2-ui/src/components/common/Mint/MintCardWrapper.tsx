import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { MintCardProps } from "~/utils";
import { useMrgnlendStore } from "~/store";

import { IconCheck, IconBell, IconSol } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { LST_MINT } from "~/store/lstStore";

interface MintCardWrapperProps {
  mintCard: MintCardProps;
}

export const MintCardWrapper: React.FC<MintCardWrapperProps> = ({ mintCard, ...props }) => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const [requestedAction, setRequestedAction] = React.useState<ActionType>(ActionType.MintLST);

  const requestedToken = React.useMemo(
    () =>
      extendedBankInfos.find((bank) => bank?.info?.state?.mint.equals && bank?.info?.state?.mint.equals(LST_MINT))
        ?.address,
    [extendedBankInfos]
  );
  return (
    <Card variant="default" className="relative">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="absolute top-[-12px] h-[24px] flex gap-2 items-center text-sm font-normal bg-chartreuse text-black px-3 rounded-[100px]">
            <div>
              <mintCard.labelIcon size={22} />
            </div>
            {mintCard.label}
          </div>
          <mintCard.icon />
          <div className="flex flex-col">
            <h3>{mintCard.title}</h3>
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

        <ul className="flex gap-2 text-xs">
          <li className="text-muted-foreground">Volume</li>
          <li>{mintCard.volume}</li>
          <li className="text-muted-foreground">{mintCard.volumeUsd}</li>
        </ul>

        {mintCard.title === "LST" ? (
          <ActionBoxDialog
            requestedAction={requestedAction}
            requestedToken={requestedAction === ActionType.UnstakeLST ? requestedToken : undefined}
          >
            <div className="flex items-center gap-2 mt-3">
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
