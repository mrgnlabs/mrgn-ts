import React from "react";
import Image from "next/image";
import { PublicKey } from "@solana/web3.js";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionBox } from "@mrgnlabs/mrgn-ui";
import { getDepositsData, getRateData } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { IconMrgn } from "~/components/ui/icons";
import { Skeleton } from "~/components/ui/skeleton";

interface MfiIntegrationCardProps {
  lstBank: ExtendedBankInfo;
  connected: boolean;
  refreshUserData: (options?: { clearStakeAccountsCache?: boolean; newAccountKey?: PublicKey }) => void;
}

const MfiIntegrationCard = ({ lstBank, connected, refreshUserData }: MfiIntegrationCardProps) => {
  const depositData = React.useMemo(() => getDepositsData(lstBank, true), [lstBank]);
  const rateData = React.useMemo(() => getRateData(lstBank, true), [lstBank]);

  return (
    <Card variant="default" className="min-w-[300px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-3 text-xl">
          <div className="flex items-center">
            {lstBank.meta.tokenLogoUri ? (
              <Image
                alt={lstBank.meta.tokenLogoUri}
                src={lstBank.meta.tokenLogoUri}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <Skeleton className="w-10 h-10 rounded-full" />
            )}
          </div>
          {lstBank.meta.tokenSymbol}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {rateData && (
            <li className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground">APY:</span> {percentFormatter.format(rateData.rateAPY)}
            </li>
          )}
          {depositData && (
            <li className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground">Deposits:</span>
              {usdFormatter.format(depositData.bankDepositsUsd)}
            </li>
          )}
        </ul>

        <ActionBox.Lend
          isDialog={true}
          useProvider={true}
          lendProps={{
            connected: connected,
            requestedLendType: ActionType.Deposit,
            requestedBank: lstBank,
            onComplete: (newAccountKey?: PublicKey) => {
              refreshUserData({ newAccountKey });
            },
          }}
          dialogProps={{
            title: `Deposit ${lstBank.meta.tokenSymbol}`,
            trigger: (
              <Button variant="default" size="lg" className="mt-4 w-full">
                Deposit
              </Button>
            ),
          }}
        />

        <div className="flex items-center gap-2 mt-4 justify-center">
          <IconMrgn size={22} />
          <p className="text-muted-foreground text-sm">marginfi</p>
        </div>
      </CardContent>
    </Card>
  );
};

export { MfiIntegrationCard };
