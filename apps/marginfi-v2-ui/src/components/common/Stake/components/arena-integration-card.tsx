import React from "react";
import Image from "next/image";

import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { getTokenImageURL } from "@mrgnlabs/mrgn-utils";
import { PublicKey } from "@solana/web3.js";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { IconArena, IconLST } from "~/components/ui/icons";

type ArenaIntegrationCardProps = {
  lstBank?: ExtendedBankInfo;
  goatBank?: ExtendedBankInfo;
  connected: boolean;
};

const ArenaIntegrationCard = ({ lstBank, goatBank }: ArenaIntegrationCardProps) => {
  return (
    <Card variant="default" className="min-w-[300px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-3 text-xl">
          <div className="flex items-center translate-x-2">
            <Image
              alt="Goat token"
              src={getTokenImageURL(new PublicKey("CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump"))}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full"
            />
            <IconLST size={40} className="-translate-x-5" />
          </div>
          GOAT/LST
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          <li className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground">APY:</span> 25.15%
          </li>
          <li className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground">Deposits:</span> $272,490.95
          </li>
          {/* {rateData && (
            <li className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground">APY:</span> {percentFormatter.format(rateData.rateAPY)}
            </li>
          )}
          {lstDepositData && goatDepositData && (
            <li className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground">Deposits:</span>
              {usdFormatter.format(lstDepositData.bankDeposits + goatDepositData.bankDeposits)}
            </li>
          )} */}
        </ul>

        <Button variant="default" size="lg" className="mt-4 w-full">
          Deposit
        </Button>

        <div className="flex items-center gap-2 mt-4 justify-center">
          <IconArena size={22} className="text-white" />
          <p className="text-muted-foreground text-sm">the arena</p>
        </div>
      </CardContent>
    </Card>
  );
};

export { ArenaIntegrationCard };
