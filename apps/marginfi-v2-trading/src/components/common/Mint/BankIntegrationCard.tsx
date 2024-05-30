import React from "react";
import Image from "next/image";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { getDepositsData, getRateData } from "~/components/desktop/AssetList/utils";
import { ActionBoxDialog } from "~/components/common/ActionBox";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { IconMrgn } from "~/components/ui/icons";
import { numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { Skeleton } from "~/components/ui/skeleton";

interface IntegrationCardProps {
  bank: ExtendedBankInfo;
  isInLendingMode: boolean;
}

export const BankIntegrationCard = ({ bank, isInLendingMode }: IntegrationCardProps) => {
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

        <ActionBoxDialog
          requestedAction={isInLendingMode ? ActionType.Deposit : ActionType.Borrow}
          requestedBank={bank}
        >
          <Button variant="default" size="lg" className="mt-4 w-full">
            {isInLendingMode ? "Deposit" : "Borrow"}
          </Button>
        </ActionBoxDialog>

        <div className="flex items-center gap-2 mt-4 justify-center">
          <IconMrgn size={22} />
          <p className="text-muted-foreground text-sm">marginfi</p>
        </div>
      </CardContent>
    </Card>
  );
};
