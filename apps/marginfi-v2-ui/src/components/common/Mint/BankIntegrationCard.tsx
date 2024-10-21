import React from "react";
import Image from "next/image";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionBox } from "@mrgnlabs/mrgn-ui";
import { getDepositsData, getRateData } from "@mrgnlabs/mrgn-utils";

import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { IconMrgn } from "~/components/ui/icons";
import { Skeleton } from "~/components/ui/skeleton";
import { useMrgnlendStore } from "~/store";

interface IntegrationCardProps {
  bank: ExtendedBankInfo;
  isInLendingMode: boolean;
}

export const BankIntegrationCard = ({ bank, isInLendingMode }: IntegrationCardProps) => {
  const { connected } = useWallet();
  const [fetchMrgnlendState] = useMrgnlendStore((state) => [state.fetchMrgnlendState]);
  const depositData = React.useMemo(() => getDepositsData(bank, isInLendingMode, true), [bank, isInLendingMode]);
  const rateData = React.useMemo(() => getRateData(bank, isInLendingMode), [bank, isInLendingMode]);

  return (
    <Card variant="default" className="min-w-[300px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-3 text-xl">
          <div className="flex items-center">
            {bank.meta.tokenLogoUri ? (
              <Image
                alt={bank.meta.tokenLogoUri}
                src={bank.meta.tokenLogoUri}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <Skeleton className="w-10 h-10 rounded-full" />
            )}
          </div>
          {bank.meta.tokenSymbol}
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
              <span className="text-muted-foreground">{isInLendingMode ? "Deposits:" : "Available:"}</span>{" "}
              {depositData.denominationUSD
                ? usdFormatter.format(depositData.bankDeposits)
                : numeralFormatter(depositData.bankDeposits)}
            </li>
          )}
        </ul>

        <ActionBox.Lend
          isDialog={true}
          useProvider={true}
          lendProps={{
            connected: connected,
            requestedLendType: isInLendingMode ? ActionType.Deposit : ActionType.Borrow,
            requestedBank: bank,
            onComplete: () => {
              fetchMrgnlendState();
            },
          }}
          dialogProps={{
            title: `${isInLendingMode ? "Deposit" : "Borrow"} ${bank.meta.tokenSymbol}`,
            trigger: (
              <Button variant="default" size="lg" className="mt-4 w-full">
                {isInLendingMode ? "Deposit" : "Borrow"}
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
