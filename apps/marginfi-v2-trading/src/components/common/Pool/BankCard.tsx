import React from "react";

import Image from "next/image";

import { ActionType, ExtendedBankInfo, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { cn, getTokenImageURL } from "~/utils";
import { useAssetItemData } from "~/hooks/useAssetItemData";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { IconAlertTriangle } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

type BankCardProps = {
  bank: ExtendedBankInfo;
};

export const BankCard = ({ bank }: BankCardProps) => {
  const { rateAP } = useAssetItemData({ bank, isInLendingMode: true });

  return (
    <div className="bg-background-gray p-4 rounded-lg space-y-4 flex flex-col justify-between">
      <div className="flex justify-between items-center w-full gap-2">
        <div className="flex text-left gap-3">
          <div className="flex items-center">
            <Image
              src={getTokenImageURL(bank.meta.tokenSymbol)}
              className="rounded-full"
              alt={bank.meta.tokenSymbol}
              height={40}
              width={40}
            />
          </div>
          <dl>
            <dt className="font-medium text-lg">{bank.meta.tokenSymbol}</dt>
            <dd className="text-sm font-normal text-success">{rateAP.concat(...[" ", "APY"])}</dd>
          </dl>
        </div>
      </div>
      {bank.isActive && bank.position && (
        <div className="bg-background/60 py-3 px-4 rounded-lg text-sm">
          <dl className="grid grid-cols-2 gap-y-0.5">
            <dt className="text-muted-foreground">USD value</dt>
            <dd className="text-right text-white">
              {bank.position.usdValue < 0.01 ? "< $0.01" : usdFormatter.format(bank.position.usdValue)}
            </dd>
            <dt className="text-muted-foreground">Current price</dt>
            <dd className="text-right text-white">{usdFormatter.format(bank.info.state.price)}</dd>
          </dl>
        </div>
      )}
      {!bank.isActive && (
        <div className="bg-background/60 py-6 px-4 rounded-lg text-sm">
          <p className="text-muted-foreground">No current position.</p>
        </div>
      )}
      <div className="flex justify-between w-full gap-4 mt-auto">
        {bank.isActive && (
          <ActionBoxDialog requestedAction={ActionType.Withdraw} requestedBank={bank}>
            <Button className="h-12 w-1/2" variant="outline">
              Withdraw
            </Button>
          </ActionBoxDialog>
        )}
        <ActionBoxDialog requestedAction={ActionType.Deposit} requestedBank={bank}>
          <Button className="h-12 w-1/2 ml-auto" variant="default">
            Supply {bank.isActive && "more"}
          </Button>
        </ActionBoxDialog>
      </div>
    </div>
  );
};
