import React from "react";

import Link from "next/link";
import Image from "next/image";

import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { PublicKey } from "@solana/web3.js";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { percentFormatterDyn, shortenAddress } from "@mrgnlabs/mrgn-common";

import { MintPageState, cn, getTokenImageURL, signUpYbx } from "~/utils";
import { useUiStore, useLstStore, useMrgnlendStore } from "~/store";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { IconConfetti, IconExternalLink, IconArrowDown, IconArrowUp, IconYBX, IconCheck } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { DialogDescription, DialogProps } from "@radix-ui/react-dialog";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface MintCardWrapperProps {
  mintPageState: MintPageState;
  onHandleChangeMintPage: (state: MintPageState) => void;
  onClose: () => void;
}

export const MintCardWrapper: React.FC<MintCardWrapperProps> = ({
  mintPageState,
  onHandleChangeMintPage,
  onClose,
  ...props
}) => {
  const cards = React.useMemo(
    () => [
      {
        title: "LST",
        icon: IconLST,
        description: "Accrues value against SOL",
        price: `1 LST = ${numeralFormatter(lstData?.lstSolValue!)} SOL`,
        features: ["Earn 7% APY", "Pay 0% fees", "Access $3 million in liquidity"],
        volume: `234,345 LST`,
        volumeUsd: `$234,345.45`,
        action: () => setLSTDialogOpen(true),
      } as MintCardProps,
      {
        title: "YBX",
        icon: IconYBX,
        description: "Accrues value against USD",
        price: "1 YBX ≈ 1 USD",
        features: [`Earn compounded staking yield`, "Capture MEV rewards", "Earn lending yield (soon)"],
        volume: `- YBX`,
        volumeUsd: ``,
        action: () => {
          setYbxNotificationsDialogOpen(true);
        },
      } as MintCardProps,
    ],
    [lstData]
  );

  const emailInputRef = React.useRef<HTMLInputElement>(null);

  const signUpPartner = React.useCallback(async () => {
    try {
      await signUpYbx(emailInputRef, "partner");
      onHandleChangeMintPage(MintPageState.SUCCESS);
    } catch (error) {
      onHandleChangeMintPage(MintPageState.ERROR);
      return;
    }
  }, [onHandleChangeMintPage, emailInputRef]);

  return (
    <Card key={i} variant="default">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <item.icon />
          <div className="flex flex-col">
            <h3>{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5 mb-4">
          {item.features.map((feature, j) => (
            <li key={j} className="flex items-center gap-1 text-muted-foreground">
              <IconCheck className="text-success" />
              {feature}
            </li>
          ))}
        </ul>

        <ul className="flex gap-2 text-xs">
          <li className="text-muted-foreground">Volume</li>
          <li>{item.volume}</li>
          <li className="text-muted-foreground">{item.volumeUsd}</li>
        </ul>

        {item.title === "LST" ? (
          <ActionBoxDialog
            requestedAction={requestedAction}
            requestedToken={requestedAction === ActionType.UnstakeLST ? requestedToken : undefined}
            isActionBoxTriggered={lstDialogOpen}
          >
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="secondary"
                size="lg"
                className="mt-4"
                onClick={() => {
                  setRequestedAction(ActionType.MintLST);
                  // if (item.action) {
                  //   item.action();
                  // }
                }}
              >
                Mint {item.title}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="mt-4 hover:text-primary"
                onClick={() => {
                  setRequestedAction(ActionType.UnstakeLST);
                }}
              >
                Unstake {item.title}
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
  );
};
