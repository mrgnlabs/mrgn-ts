import React from "react";

import Image from "next/image";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, usdFormatter, tokenPriceFormatter } from "@mrgnlabs/mrgn-common";

import { getTokenImageURL } from "~/utils";
import { GroupData } from "~/store/tradeStore";
import { useAssetItemData } from "~/hooks/useAssetItemData";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";

type BankCardProps = {
  activeGroup: GroupData;
  bank: ExtendedBankInfo;
};

export const BankCard = ({ activeGroup, bank }: BankCardProps) => {
  const { rateAP } = useAssetItemData({ bank, isInLendingMode: true });
  return (
    <div className="bg-background border p-4 rounded-lg space-y-4 flex flex-col justify-between">
      <div className="flex justify-between items-center w-full gap-2">
        <div className="flex text-left gap-3">
          <div className="flex items-center">
            <Image
              src={getTokenImageURL(bank.info.state.mint.toBase58())}
              className="rounded-full border"
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
        {bank.isActive && (
          <div className="font-medium text-lg mr-2">
            {bank.position.amount < 0.01 ? "< $0.01" : numeralFormatter(bank.position.amount)}
            {" " + bank.meta.tokenSymbol}
          </div>
        )}
      </div>
      {bank.isActive && bank.position && (
        <div className="bg-accent/50 py-3 px-4 rounded-lg text-sm">
          <dl className="grid grid-cols-2 gap-y-0.5 text-muted-foreground">
            <dt>Current price</dt>
            <dd className="text-right text-primary">{tokenPriceFormatter(bank.info.state.price)}</dd>
            <dt>USD value</dt>
            <dd className="text-right text-primary">
              {bank.position.usdValue < 0.01 ? "< $0.01" : usdFormatter.format(bank.position.usdValue)}
            </dd>
            {bank.position.liquidationPrice && (
              <>
                <dt>Liquidation Price</dt>
                <dd className="text-right text-primary">{tokenPriceFormatter(bank.position.liquidationPrice)}</dd>
              </>
            )}
          </dl>
        </div>
      )}
      {!bank.isActive && (
        <div className="bg-background/60 py-6 px-4 rounded-lg text-sm text-muted-foreground">
          <p>No current position.</p>
        </div>
      )}
      <div className="flex justify-between w-full gap-4 mt-auto">
        {bank.isActive && (
          <ActionBoxDialog
            activeGroupArg={activeGroup}
            requestedAction={bank.position.isLending ? ActionType.Withdraw : ActionType.Repay}
            requestedBank={bank}
          >
            <Button className="h-12 w-1/2" variant="outline">
              {bank.position.isLending ? "Withdraw" : "Repay"}
            </Button>
          </ActionBoxDialog>
        )}
        <ActionBoxDialog activeGroupArg={activeGroup} requestedAction={ActionType.Deposit} requestedBank={bank}>
          <Button className="h-12 w-1/2 ml-auto" variant="default">
            Supply {bank.isActive && "more"}
          </Button>
        </ActionBoxDialog>
      </div>
    </div>
  );
};
